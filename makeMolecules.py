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
import re
import sys

rule_css_pd = pd.read_csv("./temp/atomicClassDefs.csv", header=None, delimiter="|")
rule_css = dict(zip(list(rule_css_pd[rule_css_pd.columns[0]]), list(rule_css_pd[rule_css_pd.columns[1]])))
#print(rule_css)
print(sys.argv)
print('./output/' + sys.argv[1] + '/moleculerWebsite.css')
pima = pd.read_csv("./temp/atomicClassData.csv", header=0)
#print("Rows x Columns:", pima.shape)
pima = pima.assign(targetid=pd.Series(np.arange(0, pima.shape[0])).values)
#print(pima)
target_column = pima.shape[1]-1
#print("Target column:", target_column)
trees = [None] * len(pima.columns.tolist())
threads = [None] * len(pima.columns.tolist())

def makeTree(target_column):
    feature_cols = pima.columns.tolist()[0:target_column-1]
    #print(feature_cols)
    X = pima[feature_cols]
    y = pima[pima.columns.tolist()[target_column]]
    #print("X")
    #print(X)
    #print("y")
    #print(y)


    clf = DecisionTreeClassifier(criterion="entropy")
    print(clf)
    clf = clf.fit(X,y)
    #print(clf)

    n_nodes = clf.tree_.node_count
    children_left = clf.tree_.children_left
    children_right = clf.tree_.children_right
    feature = clf.tree_.feature
    threshold = clf.tree_.threshold

    common_cols_included = []
    root_node = feature_cols[clf.tree_.feature[0]]
    print("Root node", root_node)
    for col in pima.columns.tolist()[:-1]:
        if len(pima[col]) > 0 and pima[col].all():
            common_cols_included.append(col)
    print("Common atoms:", common_cols_included)
    css_path_components = {"root": list(map(lambda colname: rule_css[colname], common_cols_included))}

    dot_data = StringIO()
    graph = export_graphviz(clf, out_file=None, feature_names=list(map(lambda x: x+":"+re.sub(r'"', '\\"', rule_css[x]), feature_cols)))
    #print(graph)
    with open('./temp/tree.dot', 'w') as f:
        f.write(graph)

#graph = pydotplus.graph_from_dot_data(dot_data.getvalue())

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

    def get_rule_css(path, column_names):
        classDict = {
            "className": "",
            "atomicRules": []
        }
        cols_included = list(common_cols_included)
        for path_idx in range(len(path)):
            subpath = path[0:path_idx+1]
            if "_".join(subpath) in css_path_components: continue
            query = " and ".join(subpath)
            query = re.sub(r'not', '~', query)
            shared_rows = pima.query(query)
            print("Path: %s, query: %s, shared rows: %d" % ("_".join(subpath), query, len(shared_rows)))
            print("Shared row ids:", shared_rows.index.tolist())
            shared_atoms = []
            for col in shared_rows.columns.tolist()[:-1]:
                if col not in cols_included and len(shared_rows[col]) > 0 and shared_rows[col].all():
                    shared_atoms.append(col)
                    cols_included.append(col)
            print("Shared:", shared_atoms)
            if len(shared_atoms) > 0:
                css_path_components["root_" + "_".join(subpath)] = list(map(lambda colname: rule_css[colname], shared_atoms))
        classDict["className"] = "root_" + "_".join(path)
        return json.dumps(classDict)

    if n_nodes > 1:
        leave_id = clf.apply(X)
        node_indicator = clf.decision_path(X)
        print(clf.tree_.feature)
        paths = {}
        for sample_id in range(len(X)):
            path = []
            node_index = node_indicator.indices[node_indicator.indptr[sample_id]:
                                                node_indicator.indptr[sample_id + 1]]
            for node_id in node_index:
                if leave_id[sample_id] == node_id:
                    continue
                if (X.iat[sample_id, clf.tree_.feature[node_id]] <= threshold[node_id]):
                    threshold_sign = "not"
                else:
                    threshold_sign = ""
                path.append("%s%s" % (threshold_sign, feature_cols[clf.tree_.feature[node_id]]))
            #print(path)
            paths[sample_id] = path

        rules = []
        for sample_id in paths:
            rules.append(get_rule_css(paths[sample_id], pima.columns))
            
        #print(json.dumps(rules))
        with open('./temp/molecules.json', 'w') as f:
            f.write(json.dumps(rules))
        with open('./output/' + sys.argv[1] + '/molecularWebsite.css', 'w') as f:
            for subpath in css_path_components:
                f.write(".%s {\n" % subpath)
                for cssprop in css_path_components[subpath]:
                    f.write("\t%s;\n" % cssprop)
                f.write("}\n\n")

#print(rules)

    return clf

makeTree(target_column)

#split dataset in features and target variable
#with ThreadPoolExecutor(max_workers=1) as executor:
#    for i in range(0, 500):
#        threads[i] = executor.submit(makeTree, target_column)
#        target_column += 1
        
