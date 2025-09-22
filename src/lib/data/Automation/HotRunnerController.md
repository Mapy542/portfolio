#! title: Hot Runner Controller
#! date: 9/22/2025
#! tags: automation, controls, process, industrial, hot runner, molding, imm, plastics
#! description: A custom hot runner controller card for an injection molding machine.
#! author: Eli Bukoski
#! image: project-highlights/hotrunnerrev1.webp

# The Atmega Hot Runner Controller

This was more of a personal project to replicate the Q15 series card style hot runner controllers. I changed out the microcontroller for an Arduino Nano and updated the user interface for an OLED display. The goal was to make a more user friendly and modern version of the classic hot runner controller. It would also also for troubleshooting as compared to the original cards which seemed to fail with no indication of what was wrong. It was also supported by work, so yay for that.

I worked on 2 revisions of the card. While the mostly worked, my lack of experience with PCB design showed. The thermocouple ADC did not work reliably. Plus the controls system I implemented, a static PID loop, was not sufficient for the application.

It was an interesting project, and something I'd like to revisit in the future.

![Hot Runner Controller](project-highlights/hotrunnerrev1.webp){Rev 2 of the hot runner controller card.}
![Hot Runner Controller in Mainframe](project-highlights/hotrunnerinframe.webp){The hot runner controller card in a mainframe.}
![Hot Runner EDA Design](project-highlights/hotrunnereda.webp){EDA design of the hot runner controller card.}
