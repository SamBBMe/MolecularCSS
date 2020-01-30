import pandas as pd
from sklearn.tree import DecisionTreeClassifier # Import Decision Tree Classifier
from sklearn.model_selection import train_test_split # Import train_test_split function
from sklearn import metrics #Import scikit-learn metrics module for accuracy calculation
from sklearn.tree import export_graphviz
from sklearn.externals.six import StringIO  
from IPython.display import Image  
import pydotplus
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

    #dot_data = StringIO()
    graph = export_graphviz(clf, out_file=None)
    #graph = pydotplus.graph_from_dot_data(dot_data.getvalue())
    #print(graph)
    #print(target_column) 

    return clf

#split dataset in features and target variable
with ThreadPoolExecutor(max_workers=60) as executor:
    for i in range(0, len(pima.columns.tolist())):
        threads[i] = executor.submit(makeTree, target_column)
        target_column += 1


 
#graph.write_png('./temp/test.png')
#Image(graph.create_png())