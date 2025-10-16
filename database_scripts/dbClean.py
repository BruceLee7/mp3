#!/usr/bin/env python

"""
 * @file dbClean.py
 * Used in CS498RK MP4 to empty database of all users and tasks.
 *
 * @author Aswin Sivaraman
 * @date Created: Spring 2015
 * @date Modified: Spring 2015
 * @date Modified: Spring 2019
"""

import sys
import getopt
import http.client
import urllib
import json

def usage():
    print('dbClean.py -u <baseurl> -p <port>')

def getUsers(conn):
    # Retrieve the list of users
    conn.request("GET","""/api/users?filter={"_id":1}""")
    response = conn.getresponse()
    data = response.read()
    d = json.loads(data)

    # Array of user IDs
    users = [str(d['data'][x]['_id']) for x in range(len(d['data']))]

    return users

def getTasks(conn):

    conn.request("GET","""/api/tasks?filter={"_id":1}""")
    response = conn.getresponse()
    data = response.read()
    d = json.loads(data)

    tasks = [str(d['data'][x]['_id']) for x in range(len(d['data']))]

    return tasks

def main(argv):

    baseurl = "localhost"
    port = 4000

    try:
        opts, args = getopt.getopt(argv,"hu:p:",["url=","port="])
    except getopt.GetoptError:
        usage()
        sys.exit(2)
    for opt, arg in opts:
        if opt == '-h':
             usage()
             sys.exit()
        elif opt in ("-u", "--url"):
             baseurl = str(arg)
        elif opt in ("-p", "--port"):
             port = int(arg)

    conn = http.client.HTTPConnection(baseurl, port)

    users = getUsers(conn)

    while len(users):

        for user in users:
            conn.request("DELETE","/api/users/"+user)
            response = conn.getresponse()
            data = response.read()

        users = getUsers(conn)

    tasks = getTasks(conn)

    while len(tasks):

        for task in tasks:
            conn.request("DELETE","/api/tasks/"+task)
            response = conn.getresponse()
            data = response.read()

        tasks = getTasks(conn)

    conn.close()
    print("All users and tasks removed at "+baseurl+":"+str(port))


if __name__ == "__main__":
     main(sys.argv[1:])
