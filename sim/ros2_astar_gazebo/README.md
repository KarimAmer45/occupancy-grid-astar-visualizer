# ROS 2/Gazebo A* Demo

This package provides a small Gazebo world and a ROS 2 node for publishing a matching occupancy grid and A* path.

## Topics

- `/demo/occupancy_grid` - `nav_msgs/OccupancyGrid`
- `/demo/astar_path` - `nav_msgs/Path`

## Build And Run

From the repository root:

```bash
colcon build --base-paths sim/ros2_astar_gazebo
source install/setup.bash
ros2 launch ros2_astar_gazebo demo.launch.py
```

Run without Gazebo:

```bash
ros2 launch ros2_astar_gazebo demo.launch.py use_gazebo:=false
```

Open RViz, set the fixed frame to `map`, then add the OccupancyGrid and Path displays.
