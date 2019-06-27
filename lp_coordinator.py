from googlemaps import *
from pulp import LpBinary, LpMaximize, COIN_CMD, LpProblem, LpVariable, value, lpSum
with open('API-Key.txt') as f:
    api_key = f.readline()
    f.close


ERROR_MULTIPLE_EVENTS = "Not all groups belonged to the same event"
ERROR_MIN_TEAM_NOT_FULLFILLED = "There must be at least 9 teams to be assigned"
ERROR_NOT_DIVIDABLE_BY_THREE = "The number of teams is not dividable by 3"
DEFAULT_DISTANCE = 1200

COURSE_STARTER, COURSE_MAIN, COURSE_DESSERT = range(3)
COURSES = [COURSE_STARTER, COURSE_MAIN, COURSE_DESSERT]
COUNTRY = "Österreich"

class Adress():

    def __init__(self, street, doorbell, postal_code, city, country):
        self.city = city
        self.street = street
        self.postal_code = postal_code
        self.doorbell = doorbell
        self.country = country
    
    def __str__(self):
        return '%s %s, %s %s, %s' %(self.street, str(self.doorbell), str(self.postal_code), self.city, self.country)

#notes
class Team():

    def __init__(self, id, adress, preferred_course, disliked_course):
        self.id = id
        self.adress = adress
        self.preferred_course = preferred_course
        self.disliked_course = disliked_course


class Coordinator():

    def __init__(self, teams):
        self.teams = teams

    def assign_to_groups(self, method="simple"):
        if method == "simple":
            self.__load_data_simple()
        elif method == "distance":
            # TODO ensure that there is only one instance running
            # (e.g. celery lock)
            self.__load_data_distance()
        else:
            raise Exception("unkown assignment method %s" % method)
        self.prob.solve(COIN_CMD(threads=4, msg=1, presolve=1))

    def get_groups(self):
        members = {}
        chefs = {}
        for course in COURSES:
            members[course] = {}
            chefs[course] = {}
            for group in self.groups:
                members[course][group] = []
                chefs[course][group] = None
                for team in self.teams:
                    if value(self.chef[course][team][group]) == 1:
                        chefs[course][group] = team
                    if value(self.assign[course][team][group]) == 1 and team != chefs[course][group]:
                        members[course][group].append(team)
        return (chefs, members)

    def __load_data_simple(self):
        # There must be at least 9 teams to perform the assigment
        if len(self.teams) < 9:
            raise Exception(ERROR_MIN_TEAM_NOT_FULLFILLED)
        # The number of teams must be dividable by 3
        if len(self.teams) % 3:
            raise Exception(ERROR_NOT_DIVIDABLE_BY_THREE)

        self.groups = [g for g in range(len(self.teams) // 3)]
        self.happiness = {}
        self.distance = {}

        for t in self.teams:
            self.happiness[t] = [0, 0, 0]
            self.happiness[t][t.preferred_course] = 1
            self.happiness[t][t.disliked_course] = -1
        # binary Decision Variables
        self.assign = LpVariable.dicts(
            "Assign team t to group g for course ",
            (COURSES, self.teams, self.groups), 0, 1, LpBinary)
        self.chef = LpVariable.dicts(
            "Make team t chef of group g for course ",
            (COURSES, self.teams, self.groups), 0, 1, LpBinary)
        # add equations to model
        self._objective_simple()
        self._team_to_group_per_course()
        self._teams_in_group_per_course()
        self._teams_only_once_in_same_group()
        self._team_as_chef_per_course()
        self._teams_as_chef_in_group()
        self._teams_as_chef_once()
        self._teams_as_chef_only_in_group()

    def __load_data_distance(self):
        # There must be at least 9 teams to perform the assigment
        if len(self.teams) < 9:
            raise Exception(ERROR_MIN_TEAM_NOT_FULLFILLED)
        # The number of teams must be dividable by 3
        if len(self.teams) % 3:
            raise Exception(ERROR_NOT_DIVIDABLE_BY_THREE)

        self.groups = [g for g in range(len(self.teams) // 3)]
        self.happiness = {}
        for t in self.teams:
            # Accept a longer walking time of up to ten minutes before
            # assigning less prefered courses
            self.happiness[t] = {}
            for t in self.teams:
                self.happiness[t] = [0, 0, 0]
                self.happiness[t][t.preferred_course] = 600
                self.happiness[t][t.disliked_course] = -600

        gmaps = Client(key=api_key)
        self.distances = {}
        for team1 in self.teams:
            self.distances[team1] = {}
            for team2 in self.teams:
                self.distances[team1][team2] = 0

        adresses = [str(team.adress) for team in self.teams]
        #The distance matrix is symmetrical with a diagonal row of 0
        #This means we only have to get the distance information for teams up to i-1 for team i
        for i in range(1, len(self.teams)):
            try:
                result = gmaps.distance_matrix(origins = adresses[i], destinations = adresses[0:i], mode = "walking")

                elements = result["rows"][0]["elements"]
                for j in range(i):
                    if elements[j]["status"] == 'OK':
                        self.distances[self.teams[i]][self.teams[j]] = elements[j]["duration"]["value"]
                        self.distances[self.teams[j]][self.teams[i]] = elements[j]["duration"]["value"]
                    else:
                        self.distances[self.teams[i]][self.teams[j]] = DEFAULT_DISTANCE
                        self.distances[self.teams[j]][self.teams[i]] = DEFAULT_DISTANCE

            except Exception as e:
                print(str(e))
                for j in range(i):
                    self.distances[self.teams[i]][self.teams[j]] = DEFAULT_DISTANCE
                    self.distances[self.teams[j]][self.teams[i]] = DEFAULT_DISTANCE

        # binary Decision Variables
        self.assign = LpVariable.dicts(
            "Assign team t to group g for course ",
            (COURSES, self.teams, self.groups), 0, 1, LpBinary)
        self.chef = LpVariable.dicts(
            "Make team t chef of group g for course ",
            (COURSES, self.teams, self.groups), 0, 1, LpBinary)
        self.arc = LpVariable.dicts(
            "The Route between team i and team j for team t in course c in group g",
            (COURSES, self.teams, self.teams, self.teams, self.groups), 0, 1, LpBinary)
        # add equations to model
        self._objective_distance()
        self._team_to_group_per_course()
        self._teams_in_group_per_course()
        self._teams_only_once_in_same_group()
        self._team_as_chef_per_course()
        self._teams_as_chef_in_group()
        self._teams_as_chef_once()
        self._teams_as_chef_only_in_group()
        self._routes_for_assigned_teams_only()
        self._start_from_home()
        self._routes_to_chef_only()
        self._start_from_previous_destination()

    def _objective_simple(self):
        """
        Optimization objective.

        Maximize the happiness of all teams.
        """
        self.prob = LpProblem("Team Assignment", LpMaximize)
        self.prob += lpSum(
            self.chef[c][t][g] * self.happiness[t][c]
            for c in COURSES for t in self.teams
            for g in self.groups
        )

    def _objective_distance(self):
        """
        Optimization objective.

        Maximize the happiness of all teams.
        """
        self.prob = LpProblem("Team Assignment", LpMaximize)
        self.prob += lpSum(
            self.chef[c][t][g] * self.happiness[t][c] -
            self.arc[c][i][j][t][g] * self.distances[i][j]
            for c in COURSES for t in self.teams
            for i in self.teams for j in self.teams
            for g in self.groups
        )

    def _routes_for_assigned_teams_only(self):
        """
        in each course each team can go only the route to a group if it is assigned to it
        """
        for c in range(1, len(COURSES)):
            for t in self.teams:
                for g in self.groups:
                    self.prob += lpSum(
                        [self.arc[COURSES[c]][i][j][t][g] for i in self.teams
                         for j in self.teams]) == self.assign[COURSES[c]][t][g]

    def _start_from_home(self):
        """
        teams start from their home location
        """
        for t in self.teams:
            for g in self.groups:
                self.prob += lpSum(
                    [self.arc[COURSES[0]][t][j][t][g] for j in self.teams])\
                             == self.assign[COURSES[0]][t][g]

    def _routes_to_chef_only(self):
        """
        Teams can only go to the chef of their group
        """
        for c in COURSES:
            for t in self.teams:
                for i in self.teams:
                    for j in self.teams:
                        for g in self.groups:
                            self.prob += self.arc[c][i][j][t][g] <= self.chef[c][j][g]

    def _start_from_previous_destination(self):
        """
        The starting point for a route is the destinatino of prev. course
        """
        for c in range(1, len(COURSES)):
            for t in self.teams:
                for i in self.teams:
                    self.prob +=\
                        lpSum([self.arc[COURSES[c]][i][j][t][g] for j in self.teams for g in self.groups if j is not i])\
                         == lpSum([self.arc[COURSES[c-1]][r][i][t][g] for r in self.teams for g in self.groups])


    def _team_to_group_per_course(self):
        """
        Assign each team to exactly one group per course.
        """
        for c in COURSES:
            for t in self.teams:
                self.prob += lpSum(
                    [self.assign[c][t][g] for g in self.groups])\
                    == 1

    def _teams_in_group_per_course(self):
        """
        Assign exactly 3 teams to a group per course.
        """
        for c in COURSES:
            for g in self.groups:
                self.prob += lpSum(
                    [self.assign[c][t][g] for t in self.teams])\
                    == 3

    def _teams_only_once_in_same_group(self):
        """
        Assign teams only once to be in the same group.

        In case they would be in the same group again for another course
        the sum of their assignments would be 4.
        """
        for c1 in range(len(COURSES)):
            for c2 in range(c1+1, len(COURSES)):
                for g1 in self.groups:
                    for g2 in self.groups:
                        for t1 in range(len(self.teams)):
                            for t2 in range(t1+1, len(self.teams)):
                                self.prob +=\
                                    self.assign[COURSES[c1]][self.teams[t1]][g1] +\
                                    self.assign[COURSES[c1]][self.teams[t2]][g1] +\
                                    self.assign[COURSES[c2]][self.teams[t1]][g2] +\
                                    self.assign[COURSES[c2]][self.teams[t2]][g2] <= 3

    def _team_as_chef_per_course(self):
        """
        There can only be one chef in one group per course.

        Not every team has to be chef in a course.
        """
        for c in COURSES:
            for t in self.teams:
                self.prob += lpSum(
                    [self.chef[c][t][g] for g in self.groups])\
                    <= 1

    def _teams_as_chef_in_group(self):
        """
        There is exactly one chef in one group per course.
        """
        for c in COURSES:
            for g in self.groups:
                self.prob += lpSum(
                    [self.chef[c][t][g] for t in self.teams])\
                    == 1

    def _teams_as_chef_once(self):
        """
        Set any team to be chef only once.
        """

        for c1 in range(len(COURSES)):
            for c2 in range(c1+1, len(COURSES)):
                for t in self.teams:
                    for g1 in self.groups:
                        for g2 in self.groups:
                            self.prob += self.chef[COURSES[c1]][t][g1] +\
                                self.chef[COURSES[c2]][t][g2] <= 1

    def _teams_as_chef_only_in_group(self):
        """
        Set a teams to be chef in a group only if it is in that group.
        """

        for c in COURSES:
            for t in self.teams:
                for g in self.groups:
                    self.prob += self.chef[c][t][g] <= self.assign[c][t][g]
