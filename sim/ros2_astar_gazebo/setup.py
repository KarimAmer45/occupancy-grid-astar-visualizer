from glob import glob
from setuptools import setup

package_name = "ros2_astar_gazebo"

setup(
    name=package_name,
    version="0.1.0",
    packages=[package_name],
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
        ("share/" + package_name + "/launch", glob("launch/*.py")),
        ("share/" + package_name + "/worlds", glob("worlds/*.sdf")),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="Occupancy Grid A* Demo",
    maintainer_email="maintainer@example.com",
    description="ROS 2 and Gazebo demo for a 2D occupancy grid A* planner.",
    license="MIT",
    tests_require=["pytest"],
    entry_points={
        "console_scripts": [
            "grid_planner_node = ros2_astar_gazebo.occupancy_grid_node:main",
        ],
    },
)
