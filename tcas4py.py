import time
import math
import sys
import traceback
import requests
import threading
import subprocess
import datetime

BASE_ENDPOINT = 'https://data-live.flightradar24.com/zones/fcgi/feed.js'
R = 3958.8  # Earth radius in meters
REQUEST_SLICE_WIDTH = 5
OVERLAP_WIDTH = 1
LONGITUDE_BATCH_WIDTH = 10
LATITUDE_BATCH_HEIGHT = 10


def parse_raw_result(raw_result):
    filtered_planes = []
    for key, val in raw_result.items():

        if key == "full_count" or key == "stats" or key == "version":
            continue

        new_plane = {}
        new_plane["hex"] = key
        new_plane["heading"] = val[3]
        new_plane["alt"] = val[4]
        new_plane["speed"] = val[5]
        new_plane["flight"] = val[16]
        new_plane["typecode"] = val[8]
        new_plane["origin"] = val[11]
        new_plane["destination"] = val[12]
        new_plane["lat"] = val[1]
        new_plane["lon"] = val[2]

        if not new_plane["lat"] or not new_plane["lon"] or new_plane["alt"] == 0 or new_plane["speed"] < 100:
            continue

        filtered_planes.append(new_plane)

    return filtered_planes


def get_distance(lat1, lon1, alt1, lat2, lon2, alt2):
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi/2)**2 + math.cos(phi1) * \
        math.cos(phi2)*math.sin(dlambda/2)**2

    horizontal_distance_miles = (2*R*math.atan2(math.sqrt(a), math.sqrt(1 - a)))
    vertical_distance_miles = abs(alt1 - alt2) / 5280

    hypotenuse_distance_miles = math.sqrt(pow(horizontal_distance_miles, 2) + pow(vertical_distance_miles, 2))

    return hypotenuse_distance_miles

def add_planes_to_collision_check_boxes(all_planes):
    for toplat in range(90, -90, -LATITUDE_BATCH_HEIGHT):
        for leftlon in range(-180, 180, LONGITUDE_BATCH_WIDTH): 
            box_top_left = (toplat, lon)
            box_top_right = toplat + LONGITUDE_BATCH_WIDTH + OVERLAP_WIDTH
            box_bottom_left = toplat - LATITUDE_BATCH_HEIGHT - OVERLAP_WIDTH
            box_bottom_right = box_bottom_left



def get_all_planes():
    # toplat, bottomlat, leftlon, rightlon
    all_raw_jsons = {}
    for leftlon in range(-180, 180, REQUEST_SLICE_WIDTH):
        rightlon = leftlon + REQUEST_SLICE_WIDTH
        slice_url = BASE_ENDPOINT + f'?bounds=90,-90,{leftlon},{rightlon}'
        raw_json = requests.get(slice_url, headers={'user-agent': 'my-app/0.0.1'}).json()
        print(f"Number for {slice_url} : {len(raw_json)}")

        all_raw_jsons.update(raw_json)

    all_planes = parse_raw_result(all_raw_jsons)

    print(f"Found {len(all_planes)} planes")

    return all_planes


def compute():

    all_planes = get_all_planes()

    collision_check_boxes = add_planes_to_collision_check_boxes(all_planes)

    closest = {}
    closest['distance'] = 5000
    comparisons = 0

    for plane_index, plane in enumerate(all_planes):

        for other_plane_index, other_plane in enumerate(all_planes[plane_index + 1:]):
            comparisons += 1
            distance_between = get_distance(
                plane["lat"], plane["lon"], plane["alt"], other_plane["lat"], other_plane["lon"], other_plane["alt"])
            if (distance_between < closest['distance']):
                closest['distance'] = distance_between
                closest['plane_one'] = plane
                closest['plane_two'] = other_plane

    print(f"Number of comparisons: {comparisons}")
    print(f"Done. The closest happened to be {closest['distance']} miles apart")
    print(f"Plane One: {str(closest['plane_one'])}")
    print(f"Plane Two: {str(closest['plane_two'])}")
    print(f"https://www.flightradar24.com/{closest['plane_one']['hex']}")
    print(f"https://www.flightradar24.com/{closest['plane_two']['hex']}")

    threading.Timer(90, compute).start()


if __name__ == "__main__":
    compute()
