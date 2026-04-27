import heapq
from dataclasses import dataclass

import rclpy
from geometry_msgs.msg import Pose, PoseStamped, Quaternion
from nav_msgs.msg import OccupancyGrid, Path
from rclpy.node import Node


WIDTH = 20
HEIGHT = 14
RESOLUTION = 1.0
START = (1, 1)
GOAL = (18, 12)


@dataclass(frozen=True)
class Cell:
    x: int
    y: int


def make_grid():
    grid = [[0 for _ in range(WIDTH)] for _ in range(HEIGHT)]

    for y in range(1, 12):
        if y not in (6, 7):
            grid[y][5] = 100

    for x in range(8, 18):
        if x not in (12, 13):
            grid[6][x] = 100

    for y in range(8, 13):
        if y != 10:
            grid[y][14] = 100

    grid[START[1]][START[0]] = 0
    grid[GOAL[1]][GOAL[0]] = 0
    return grid


def heuristic(a, b):
    return abs(a.x - b.x) + abs(a.y - b.y)


def neighbors(grid, cell):
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx = cell.x + dx
        ny = cell.y + dy
        if 0 <= nx < WIDTH and 0 <= ny < HEIGHT and grid[ny][nx] == 0:
            yield Cell(nx, ny)


def reconstruct(came_from, current):
    path = [current]
    while current in came_from:
        current = came_from[current]
        path.append(current)
    path.reverse()
    return path


def astar(grid, start, goal):
    start_cell = Cell(*start)
    goal_cell = Cell(*goal)
    counter = 0
    open_heap = [(0, counter, start_cell)]
    came_from = {}
    g_score = {start_cell: 0}

    while open_heap:
        _, _, current = heapq.heappop(open_heap)
        if current == goal_cell:
            return reconstruct(came_from, current)

        for neighbor in neighbors(grid, current):
            tentative = g_score[current] + 1
            if tentative < g_score.get(neighbor, 1_000_000):
                came_from[neighbor] = current
                g_score[neighbor] = tentative
                priority = tentative + heuristic(neighbor, goal_cell)
                counter += 1
                heapq.heappush(open_heap, (priority, counter, neighbor))

    return []


class GridPlannerNode(Node):
    def __init__(self):
        super().__init__("grid_planner_node")
        self.grid = make_grid()
        self.path = astar(self.grid, START, GOAL)
        self.grid_pub = self.create_publisher(OccupancyGrid, "demo/occupancy_grid", 10)
        self.path_pub = self.create_publisher(Path, "demo/astar_path", 10)
        self.timer = self.create_timer(1.0, self.publish)
        self.get_logger().info(
            f"Publishing occupancy grid {WIDTH}x{HEIGHT} and A* path with {len(self.path)} cells."
        )

    def grid_origin(self):
        pose = Pose()
        pose.position.x = -WIDTH * RESOLUTION / 2.0
        pose.position.y = -HEIGHT * RESOLUTION / 2.0
        pose.orientation = Quaternion(w=1.0)
        return pose

    def cell_to_world(self, cell):
        origin_x = -WIDTH * RESOLUTION / 2.0
        origin_y = -HEIGHT * RESOLUTION / 2.0
        return (
            origin_x + (cell.x + 0.5) * RESOLUTION,
            origin_y + (cell.y + 0.5) * RESOLUTION,
        )

    def publish(self):
        stamp = self.get_clock().now().to_msg()

        grid_msg = OccupancyGrid()
        grid_msg.header.stamp = stamp
        grid_msg.header.frame_id = "map"
        grid_msg.info.resolution = RESOLUTION
        grid_msg.info.width = WIDTH
        grid_msg.info.height = HEIGHT
        grid_msg.info.origin = self.grid_origin()
        grid_msg.data = [value for row in self.grid for value in row]
        self.grid_pub.publish(grid_msg)

        path_msg = Path()
        path_msg.header.stamp = stamp
        path_msg.header.frame_id = "map"
        for cell in self.path:
            pose = PoseStamped()
            pose.header = path_msg.header
            pose.pose.orientation.w = 1.0
            pose.pose.position.x, pose.pose.position.y = self.cell_to_world(cell)
            path_msg.poses.append(pose)
        self.path_pub.publish(path_msg)


def main(args=None):
    rclpy.init(args=args)
    node = GridPlannerNode()
    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
