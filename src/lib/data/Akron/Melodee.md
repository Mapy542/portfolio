#! title: MELODEE
#! date: 9/21/2025
#! tags: lunabotics, competition, rover, robot, electrical, mechanical design, CAD, inventor, solidworks, 3d printing, sla, laser cut
#! description: A better excavation rover for the NASA Lunabotics competition.
#! author: Eli Bukoski
#! image: project-highlights/melodeeatUCF.webp

# MELODEE

MELODEE is the second excavation rover I worked on for the NASA Lunabotics competition. As the electrical technical lead, I worked primarily on the overall electrical system architecture, while focusing on a new networked IO system for the robot, Roobot over IP.

We made significant improvements to the mechanical design, making the rover lighter and faster and migrated to Robot Operating System (ROS) for the software stack. MELODEE was a much more competitive rover, and we placed 2nd overall at the first leg of competition, at UCF. Then we came in 3rd place for autonomy overall at the finals at Kennedy Space Center.

"Roobot" over IP was a success, and we are continuing to develop it for future rovers. It's primary feature is the bus like ability for all modules and master servers to communicate with each other over a regular network stack. This allows for failover redundancy, state or stored truth synchronization, and an easy to expand interface for adding new modules. It's also tolerant of high latency and low bandwidth, making it ideal for space applications via a custom reliable connection over UDP system.

R.O.I. modules were built with AVR microcontrollers and Wiznet ethernet chips as the main core. However, the system is built to be hardware agnostic, and we are working towards implementing more powerful and affordable module compute.
[Read more about ROI on the repository.](https://github.com/UA-NASA-Robotics/Roobot-Over-IP/tree/main)

#!g
![Melodee at UCF](project-highlights/melodeeatUCF.webp){MELODEE at UCF for the first leg of competition.}
![Final Electrical Box](project-highlights/melodeeeboxfinalwithpower.webp){The final electrical box design.}
![Melodees Battery](project-highlights/melodeebattery.webp){The battery}
![Battery in position](project-highlights/melodeebatteryinpos_fix.webp){The battery in position.}
#!g

## Roobot over IP PCBs

#!g
![ROI Actuator Board](project-highlights/roiactboard.webp){An actuator board for Roobot over IP.}
![ROI Boards for Melodee](project-highlights/roiboardsmelodee.webp){Some of the Roobot over IP boards made for MELODEE.}
![ROI Preliminary Board](project-highlights/roipcbprelim.webp){A preliminary Roobot over IP board.}
