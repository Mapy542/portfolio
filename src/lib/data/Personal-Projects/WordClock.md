#! title: Word Clock
#! date: 9/24/2025
#! tags: arduino, clock, led, woodworking, electronics, laser
#! description: A home-made word clock that tells time using illuminated words.
#! author: Eli Bukoski
#! image: project-highlights/wordclockfront.webp

# The Word Clock

I was fascinated by the idea of a word clock after seeing ones online. A word clock tells time using illuminated words instead of numbers. I decided to make my own version using an Arduino, some LED lights, and a wooden frame.

The clock structure was designed in Tinkercad, as I was a freshman school at the time and had no experience with CAD software. I designed it to assemble via finger or box joints along the edges. The design was laser cut from 1/8" plywood.

As for the hardware inside, the words were illuminated by strips of LED tape, diffused through printer paper. To drive these LEDs I originally put together a protoboard with transistors to switch the lights power. Then all 16 or so signals were driven from an Arduino Mega. This did not work, for any number of reasons, and so I switched to an off the shelf PWM driver, Arduino Uno, and a real time clock module. The code was written in the Arduino IDE.

I also made it into an alarm clock by adding a speaker and audio amplifier. Then the alarm time and tone could be configured via an SD card.

#!g
![Front of the clock](project-highlights/wordclockfront.webp){The front of the clock, showing the illuminated words.}
![Top of the clock](project-highlights/wordclocktop_fix.webp){The top of the clock, showing the stop button}
![Side view of the clock](project-highlights/wordlcockside.webp){The side view of the clock, showing the finger joints.}
#!g
