from lp_coordinator import Adress, Team, Coordinator, COURSE_STARTER, COURSE_DESSERT, COURSE_MAIN, COURSES
import csv

CSV_ID, CSV_STREET, CSV_DOORBELL, CSV_POSTAL_CODE, CSV_CITY, CSV_PREFERRED_COURSE, CSV_DISLIKED_COURSE = range(7)

course_dict={
    "starter":COURSE_STARTER,
    "main":COURSE_MAIN,
    "dessert":COURSE_DESSERT,
}

teams = []

#open input file
try:
    with open("teams.csv", mode="r", encoding="utf-8", newline='') as csv_file:
        reader = csv.reader(csv_file, delimiter=";")
        next(reader)#discard header
        for row in reader:
            adress = Adress(row[CSV_STREET], row[CSV_DOORBELL], row[CSV_POSTAL_CODE], row[CSV_CITY])
            teams.append(Team(row[CSV_ID], adress, course_dict[row[CSV_PREFERRED_COURSE]], course_dict[row[CSV_DISLIKED_COURSE]]))
except Exception as e:
    print(str(e))
    exit()

#run the optimization
coordinator = Coordinator(teams)
coordinator.assign_to_groups()
chefs, members = coordinator.get_groups()

#write result to file
try:
    with open("groups.csv", mode="w", encoding="utf-8", newline="") as csv_file:
        writer = csv.writer(csv_file, delimiter=";")
        reverse_course_dict = dict(zip(course_dict.values(), course_dict.keys()))
        writer.writerow(["course", "group", "chef id", "member 1 id", "member 2 id"])
        for course in COURSES:
            for group in chefs[course]:
                writer.writerow([reverse_course_dict[course], group, chefs[course][group].id, members[course][group][0].id, members[course][group][1].id])
except Exception as e:
    print(str(e))
    exit()

