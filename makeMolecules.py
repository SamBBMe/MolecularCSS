import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier # Import Decision Tree Classifier
from sklearn.model_selection import train_test_split # Import train_test_split function
from sklearn import metrics #Import scikit-learn metrics module for accuracy calculation
from sklearn.tree import export_graphviz
from sklearn.externals.six import StringIO  
from IPython.display import Image  
#import pydotplus
from graphviz import Graph, Digraph
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
import json

rule_css_pd = pd.read_csv("./temp/atomicClassDefs.csv", header=None, delimiter="|")
rule_css = dict(zip(list(rule_css_pd[rule_css_pd.columns[0]]), list(rule_css_pd[rule_css_pd.columns[1]])))
print(rule_css)

pima = pd.read_csv("./temp/atomicClassData.csv", header=0)
#print("Rows x Columns:", pima.shape)
pima = pima.assign(targetid=pd.Series(np.arange(0, pima.shape[0])).values)
target_column = pima.shape[1]-1
#print("Target column:", target_column)
trees = [None] * len(pima.columns.tolist())
threads = [None] * len(pima.columns.tolist())

def makeTree(target_column):
    feature_cols = pima.columns.tolist()[0:target_column-1]
    X = pima[feature_cols]
    y = pima[pima.columns.tolist()[target_column]]
    #print("X")
    #print(X)
    #print("y")
    #print(y)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=1)

    clf = DecisionTreeClassifier()
    clf = clf.fit(X_train,y_train)
    #print(clf)
    y_pred = clf.predict(X_test)

    n_nodes = clf.tree_.node_count
    children_left = clf.tree_.children_left
    children_right = clf.tree_.children_right
    feature = clf.tree_.feature
    threshold = clf.tree_.threshold

    dot_data = StringIO()
    graph = export_graphviz(clf, out_file=None, feature_names=list(map(lambda x: x+":"+rule_css[x], feature_cols)))
    #print(graph)
    with open('./temp/tree.dot', 'w') as f:
        f.write(graph)

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
            if index!=len(path)-1:
                if (children_left[node] == path[index+1]):
                    mask += "(df['{}']<= {}) \t ".format(column_names[feature[node]], threshold[node])
                else:
                    mask += "(df['{}']> {}) \t ".format(column_names[feature[node]], threshold[node])
        mask = mask.replace("\t", "&", mask.count("\t") - 1)
        mask = mask.replace("\t", "")
        return mask

    def get_rule_css(key, path, column_names):
        classDict = {
            "className": "",
            "atomicRules": []
        }
        classDict["className"] = "prop_%s" % key
        for index, node in enumerate(path):
            if index!=len(path)-1:
                if (children_left[node] != path[index+1]):
                    classDict["atomicRules"].append(column_names[feature[node]])
        #css += "}\n"
        return json.dumps(classDict)

    if n_nodes > 1:
        leave_id = clf.apply(X_test)

        paths ={}
        for leaf in np.unique(leave_id):
            path_leaf = []
            find_path(0, path_leaf, leaf)
            paths[leaf] = np.unique(np.sort(path_leaf))

        rules = []
        for key in paths:
            rules.append(get_rule_css(key, paths[key], pima.columns))
            
        print(json.dumps(rules))
        with open('./temp/molecules.json', 'w') as f:
            f.write(json.dumps(rules))
        

#print(rules)

    return clf

makeTree(target_column)

#split dataset in features and target variable
#with ThreadPoolExecutor(max_workers=1) as executor:
#    for i in range(0, 500):
#        threads[i] = executor.submit(makeTree, target_column)
#        target_column += 1
        
