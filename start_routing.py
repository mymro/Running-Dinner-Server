from lp_coordinator import Adress, Team, Coordinator, COURSE_STARTER, COURSE_DESSERT, COURSE_MAIN, COURSES
import csv
import psycopg2
import json

DB_ID, DB_STREET, DB_DOORBELL, DB_POSTAL_CODE, DB_CITY, DB_COUNTRY, DB_PREFERRED_COURSE, DB_DISLIKED_COURSE = range(8)

course_dict={
    "starter":COURSE_STARTER,
    "main":COURSE_MAIN,
    "dessert":COURSE_DESSERT,
}

teams = []

try:
    with open("config.json", mode="r", encoding="utf-8") as json_file:
        data = json.load(json_file)
except Exception as e:
    print(str(e))
    exit(1)

try:
    conn = psycopg2.connect(dbname = data["db"], user = data["db_user"], password = data["db_pass"], host = data["db_host"], port = data["db_port"])
    cur = conn.cursor()
    cur.execute("SELECT teams.id, teams.street, teams.doorbell, teams.zip, teams.city, \
                teams.country,teams.preferred_course, teams.disliked_course  FROM users, \
                teams WHERE users.team = teams.id AND users.email_confirmed = true \
                AND users.id=(SELECT users.id FROM users WHERE users.team = teams.id LIMIT 1)")
    rows = cur.fetchall()
    conn.commit()
except Exception as e:
    print(str(e))
    exit(1)

for row in rows:
    adress = Adress(row[DB_STREET], row[DB_DOORBELL], row[DB_POSTAL_CODE], row[DB_CITY], row[DB_COUNTRY])
    teams.append(Team(row[DB_ID], adress, course_dict[row[DB_PREFERRED_COURSE]], course_dict[row[DB_DISLIKED_COURSE]]))

#run the optimization
try: 
    coordinator = Coordinator(teams, )
    coordinator.assign_to_groups(method="distance")
except Exception as e:
    print(str(e))
    exit(1)

#write result to db
try:
    chefs, members = coordinator.get_groups()
    reverse_course_dict = dict(zip(course_dict.values(), course_dict.keys()))
    cur.execute("DELETE FROM groups")
    for course in COURSES:
            for group in chefs[course]:
                cur.execute("""INSERT INTO groups (course, cook, team_1, team_2) VALUES(%s, %s, %s, %s)""",
                (reverse_course_dict[course], chefs[course][group].id, members[course][group][0].id, members[course][group][1].id))
    conn.commit()
    conn.close()
except Exception as e:
    print(str(e))
    exit(1)

