import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier # Import Decision Tree Classifier
from sklearn.model_selection import train_test_split # Import train_test_split function
from sklearn import metrics #Import scikit-learn metrics module for accuracy calculation
from sklearn.tree import export_graphviz
from sklearn.externals.six import StringIO  
from IPython.display import Image  
import pydotplus
from graphviz import Graph, Digraph
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor


target_column = 0
pima = pd.read_csv("./temp/atomicClassData.csv", header=0)
trees = [None] * len(pima.columns.tolist())
threads = [None] * len(pima.columns.tolist())
#pima.head()

def makeTree(target_column):
    feature_cols = pima.columns.tolist()[0:target_column-1] + pima.columns.tolist()[target_column+1:]
    X = pima[feature_cols] # Features
    y = pima[pima.columns.tolist()[target_column]] # Target variable

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=1)

    clf = DecisionTreeClassifier()
    clf = clf.fit(X_train,y_train)
    y_pred = clf.predict(X_test)

    n_nodes = clf.tree_.node_count
    children_left = clf.tree_.children_left
    children_right = clf.tree_.children_right
    feature = clf.tree_.feature
    threshold = clf.tree_.threshold
    #dot_data = StringIO()
    graph = export_graphviz(clf, out_file=None)
    #graph = pydotplus.graph_from_dot_data(dot_data.getvalue())
    def find_path(node_numb, path, x):
        path.append(node_numb)
        if node_numb == x:
            return True
        left = False
        right = False
        if (children_left[node_numb] !=-1):
            left = find_path(children_left[node_numb], path, x)
        if (children_right[node_numb] !=-1):
            right = find_path(children_right[node_numb], path, x)
        if left or right :
            return True
        path.remove(node_numb)
        return False


    def get_rule(path, column_names):
        mask = ''
        for index, node in enumerate(path):
            #We check if we are not in the leaf
            if index!=len(path)-1:
                # Do we go under or over the threshold ?
                if (children_left[node] == path[index+1]):
                    mask += "(df['{}']<= {}) \t ".format(column_names[feature[node]], threshold[node])
                else:
                    mask += "(df['{}']> {}) \t ".format(column_names[feature[node]], threshold[node])
        # We insert the & at the right places
        mask = mask.replace("\t", "&", mask.count("\t") - 1)
        mask = mask.replace("\t", "")
        return mask

    if n_nodes > 1:
        leave_id = clf.apply(X_test)

        paths ={}
        for leaf in np.unique(leave_id):
            path_leaf = []
            find_path(0, path_leaf, leaf)
            paths[leaf] = np.unique(np.sort(path_leaf))

        rules = {}
        for key in paths:
            rules[key] = get_rule(paths[key], pima.columns)

        print(rules)
    #if( clf.tree_.node_count > 1): 
    #    for nodeId in range(0, clf.tree_.node_count):
    #        parseTree(clf, nodeId, X_test)
        
    #print(graph)
    #print(target_column) 

    return clf


def parseTree( clf, nodeId, X_test ):
    n_nodes = clf.tree_.node_count
    children_left = clf.tree_.children_left
    children_right = clf.tree_.children_right
    feature = clf.tree_.feature
    threshold = clf.tree_.threshold

    # The tree structure can be traversed to compute various properties such
    # as the depth of each node and whether or not it is a leaf.
    node_depth = np.zeros(shape=n_nodes, dtype=np.int64)
    is_leaves = np.zeros(shape=n_nodes, dtype=bool)
    stack = [(0, -1)]  # seed is the root node id and its parent depth
    while len(stack) > 0:
        node_id, parent_depth = stack.pop()
        node_depth[node_id] = parent_depth + 1

        # If we have a test node
        if (children_left[node_id] != children_right[node_id]):
            stack.append((children_left[node_id], parent_depth + 1))
            stack.append((children_right[node_id], parent_depth + 1))
        else:
            is_leaves[node_id] = True

        print("The binary tree structure has %s nodes and has "
            "the following tree structure:"
            % n_nodes)
        for i in range(n_nodes):
            if is_leaves[i]:
                print("%snode=%s leaf node." % (node_depth[i] * "\t", i))
            else:
                print("%snode=%s test node: go to node %s if X[:, %s] <= %s else to "
                    "node %s."
                    % (node_depth[i] * "\t",
                        i,
                        children_left[i],
                        feature[i],
                        threshold[i],
                        children_right[i],
                        ))
        print()
    node_indicator = clf.decision_path(X_test)

    # Similarly, we can also have the leaves ids reached by each sample.

    leave_id = clf.apply(X_test)

    # Now, it's possible to get the tests that were used to predict a sample or
    # a group of samples. First, let's make it for the sample.

    # HERE IS WHAT YOU WANT
    sample_id = nodeId
    node_index = node_indicator.indices[node_indicator.indptr[sample_id]:
                                        node_indicator.indptr[sample_id + 1]]

    print('Rules used to predict sample %s: ' % sample_id)
    for node_id in node_index:

        if leave_id[sample_id] == node_id:  # <-- changed != to ==
            #continue # <-- comment out
            print("leaf node {} reached, no decision here".format(leave_id[sample_id])) # <--

        else: # < -- added else to iterate through decision nodes
            if (X_test[sample_id, feature[node_id]] <= threshold[node_id]):
                threshold_sign = "<="
            else:
                threshold_sign = ">"

            print("decision id node %s : (X[%s, %s] (= %s) %s %s)"
                % (node_id,
                    sample_id,
                    feature[node_id],
                    X_test[sample_id, feature[node_id]], # <-- changed i to sample_id
                    threshold_sign,
                    threshold[node_id]))
        


#split dataset in features and target variable
with ThreadPoolExecutor(max_workers=1) as executor:
    for i in range(0, 500):
        threads[i] = executor.submit(makeTree, target_column)
        target_column += 1
        


 
#graph.write_png('./temp/test.png')
#Image(graph.create_png())