import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess
from launch.conditions import IfCondition
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    package_share = get_package_share_directory("ros2_astar_gazebo")
    world_path = os.path.join(package_share, "worlds", "occupancy_grid_demo.sdf")

    use_gazebo = LaunchConfiguration("use_gazebo")

    gazebo = ExecuteProcess(
        cmd=["gazebo", "--verbose", world_path],
        output="screen",
        condition=IfCondition(use_gazebo),
    )

    planner = Node(
        package="ros2_astar_gazebo",
        executable="grid_planner_node",
        name="grid_planner_node",
        output="screen",
    )

    return LaunchDescription(
        [
            DeclareLaunchArgument(
                "use_gazebo",
                default_value="true",
                description="Launch Gazebo with the demo SDF world.",
            ),
            gazebo,
            planner,
        ]
    )
