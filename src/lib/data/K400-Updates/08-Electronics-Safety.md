#! title: 0.8 Electronics and Safety Considerations
#! date: 3/21/2026
#! tags: K400, Laser Cutter, Electronics, M2 Nano, Stepper Motor Drivers, Arduino, Safety Systems, E-Stop, Laser Disable, Control Panel, Integration, Testing
#! description: Designing and building the electronics for the K400 Laser to operate safely. Then troubleshooting performance issues.
#! author: Eli Bukoski
#! image: laser08/electronics-powered.webp

# The Laser Electronics and Control

As a foreword, this version of the electronics setup and control cabinet has essentially been entirely replaced. If you just wish to see the final result, skip to the next article on troubleshooting performance issues and the solution I went with. This post focuses on the design of the safety system and digging into the M2 Nano.

## M2 Nano

The M2 Nano is a laser code streaming device developed by Lhystudios. It’s the main controller, motor driver, and core of all K40-style laser cutters. Along with some of the laser optics, tube, and power supply, I planned to reuse the Nano for my new laser cutter. Looking into the reverse engineering of the microcode provided by  
[https://edutechwiki.unige.ch/en/Lhystudios_M2_Nano](https://edutechwiki.unige.ch/en/Lhystudios_M2_Nano)  
There’s no strict limit to how big a laser this controller can handle, as most of the move operations are relative. So, following the motif of budget first, I tried to incorporate the M2 Nano into the design.

One obvious deficiency with the board was its onboard stepper motor drivers. The Allegro chips featured are common on hobby Arduino/G-code senders, and can handle up to about 2 amps. Since I had issues with the K40 being underpowered, with its NEMA 17 stepper motors, I knew the board would not be able to handle the much bigger NEMA 23 motors I had for this laser. I wanted to use external stepper motor drivers, which can be found cheaply on Amazon. They are actually perfectly intercompatible with the Allegro chips, using the Step, Direction, and Enable interface for control. All I had to do was remove the Allegro chips from the board, and hijack the signals off of the traces to wires to plug into the external drivers.

I could then drive the stepper motors at 24V and up to 4 amps each, greatly improving the power.

#!g
![Allegro Stepper Driver versus External Module](/laser08/stepper-drivers.webp){Comparing the driver chip to external module.}
![Breakout Wires Soldered to Nano](/laser08/nano-trace-breakouts.webp){Wires Soldered to Nano for Step and Direction Signals}
#!g

## Peripherals

With the controller and axis drivers planned out, I turned to an Arduino Mega and a breakout relay board to control the rest of the peripherals of the laser. I wanted the ventilation, air assist, water cooler, and more to be controllable by either the Nano board or me. The M2 Nano has an “active” output that the Arduino can read to determine whether the laser is active, automatically enabling air assist and ventilation. A control panel switch can be used to select between the modes, forming a hand & auto configuration commonly seen in control systems. The Arduino monitored all this in addition to the safety signals to illuminate indicators, and it could also trigger the laser itself for manual pulsing.

![Arduino Peripheral Control](/laser08/electronics-safety-wiring.webp){Ardino and Relay Board In Top Left.}

## Safety Controls

It’s pretty critical to safely control this laser, since the axes are powerful enough to be dangerous, and the laser is strong enough to instantly blind or severely burn you. Ideally, a full industrial safety relay would be used to monitor for a tamperproof E-Stop and door closed signaling. However, since this laser is not intended to be a product used by anyone other than me, plus industrial safety equipment is expensive, that was not the case. I did incorporate an E-Stop and laser disabled system modeled after the industrial safety design, but just not with the tamper monitoring, self-tests, or anti-welding force guided relay contacts. It’s not perfect, but this, combined with the main power switch and mains breaker within arm's reach, is sufficient for me.

The system works via two main control relays, one for the E-stop and one for laser disable. The E-Stop relay is powered through its own contacts, and then through the E-stop signaling loop (In this case, only the red mushroom button and the Arduino). This means the relay will only be engaged when itself is engaged, and all the test contacts have continuity. If anything in the loop breaks, the relay opens, which disables all motion axes, all peripherals, and the laser. Plus, since the power for the coil is looped through the contacts, it is not self-resetting. The system can be reenergized by a reset button, which injects power into the start of the loop. This still must go through the test point,s though, so all faults must be cleared before it can be reset. The reset is a nice blue button that the Arduino can illuminate to indicate faults.

The laser disable relay is less strict. It derives its test loop from the E-Stop relay, and then tests through the door-open switch and a coolant flow sensor. This protects users, me, when the door is open from exposure, and it protects the laser from damaging itself from running without cooling. This relay is automatically resetting as soon as any fault clears, but the E-Stop relay must be engaged first.

This system sits in the perfect range of predictable and protects me and the equipment without being too intrusive. Obviously, this safety is inadequate for certain industrial regulations, although I am not sure myself if laser cutters qualify for these, but the biggest issue is potential failure modes. The relays are not high-end or rated to perform safety work. They could likely fail closed, rendering the system partially or entirely unable to be halted. There is no monitoring system to watch for contact failure within the relays, either, but again, this was acceptable to me given the circumstances for this machine. Plus, you may consider that commercial laser cutters of equal power and size ship with no protection systems in place whatsoever. Their E-stop buttons cut mains power; it does effectively shut down all equipment, but the stored energy of the system in controllers and power supplies means the device continues to operate for much too long after this stop is triggered (A category 0, coast-to-stopping).

![Relays Mounted in Cabinet](/laser08/relays.webp){Relays for E-Stop and Laser Disable Mounted in Cabinet}

## Cabinet Panel

With this plan set, I started to lay out the components onto an offcut of plywood from the laser cutter base.
[Post 0.3 Base Build](/K400-Updates/03-Base-Build)

I picked a point-to-point wiring method, utilizing mostly solid core wire, which would hold its shape. A true DIN rail and cable carrier layout would have been more professional, but space was already somewhat tight, and, foreshadowing, it would get much worse later. While the layout I chose could definitely be improved, I did pay special attention to separate the high voltage and low voltage as much as possible. All of the mains voltage and power supplies are located in the bottom right.

#!g
![Empty Cabint Panel](/laser08/electronics-panel-empty.webp){Panel to be populated with electronics}
![Components Laid Out on Panel](/laser08/electronics-layed-out.webp){Components Laid Out on Panel for Wiring}
![Some Electronics Mounted](/laser08/electronics-mounting.webp){Some Electronics Mounted on Panel}
![Safety Circuit Wiring](/laser08/electronics-safety-wiring.webp){Wiring of Safety Circuits}
#!g

## Integration (Part 1)

Following some brief testing, I mounted the panel into the laser to make the major connections. These included the axis motors, limit switches, HMI buttons, and, importantly, the power connections to the laser and peripherals. The laser is supplied by two 20A 120V breakers, 1 dedicated line for the water chiller, and 1 line to supply everything else.

Since two independent supplies are fed into the electrical cabinet, this represents an increased danger for accidental energization, or forgetting to entirely isolate the cabinet before maintenance. As a measure of protection for myself, I used a handle tie to effectively make the two breakers into a single two-pole breaker. Obviously, purchasing a 30A single-pole breaker or not using a significantly oversized chiller would be better, but given the materials I had on hand, I chose this route.

Continuing on the route of safety, I also took the time to bond the metal frame of the enclosure to the earth ground. Since raw metal is exposed externally via screw heads, and internally when the door is open, this is best practice in case of ground faults of the mains electrical. Furthermore, the 20KV laser sits inches away from the enclosure frame, and I wanted to be sure any potential arc faults would have a safe return path.

#!g
![Electronics Panel Mounted in Enclosure](/laser08/electronics-panel-mounted-in-cabinet.webp){Electronics Panel Mounted in Enclosure}
![Grounded Enclosure](/laser08/grounding-wire.webp){Earthing Enclosure Frame}
![Stepper Drivers Wried](/laser08/electronics-stepper-coms.webp){Wired Stepper Drivers to Nano}
![Wired up M2 Nano](/laser08/nano-connections.webp)
![Incoming Power Wiring](/laser08/power-wiring.webp){Messy Looking Incoming Power Wiring}
#!g

## Testing and first Cuts

#!g
![Chiller Connected](/laser08/chiller-installed.webp){Water Chiller installed}
![Air Assist Connected](/laser08/air-pump-mounted.webp){Air Assist Connected}
#!g

With everything hooked up, I could start testing the laser, and at this point, I also went back and cut the enclosure pieces, which you saw in the last post.

While the laser did produce workable enclosure walls, the overall results were less than perfect. Depending on the direction of cut, the laser would be offset from the target position, and raster engraving would look blurry, as there were double lines vertically. I determined this was likely due to the stepper motors losing steps and lagging from where the laser head was supposed to be.

#!g
![Laser Test Cuts](/laser08/test-sheild.webp){Additional Polycarbonate Shielding to stand behind during inital testing.}
![Offset cuts issue](/laser08/offest-cuts-1.webp){Offset Cuts in X Direction}
![Offset cuts issue 2](/laser08/offset-cuts2.webp)
![Raster Cuts Blurry](/laser08/blurry-edinboro.webp){Blurry Raster Cuts}
#!g

However, the more difficult question was how and why. I first suspected that the modification I made to the Nano was the cause, as it changed from the MCU driving a short trace into a TTL input of an Allegro stepper driver chip to the MCU driving an opto-isolator over a much longer wire. I figured the IO pins were insufficient to drive that new burden, and set out to make a repeater by hooking two CMOS inverters in sequence. I took 3x CMOS chips and soldered together a circuit on a protoboard to form the 4 repeaters I would need: X Step, X Dir, Y Step, and Y Dir. I then wired this board into the laser for testing.

It had a worse effect on the laser. In hindsight, I was working without any oscilloscope, guessing at the root cause of the issue anyway, but my choice of CMOS chip had actually made things worse. See, I was familiar with the chip from Digital Logic Lab in college, and something that never occurred to me was that the chip was long obsolete and quite bad from a modern electronics standard. In fact, one of the lab experiments was to measure the slew rate and propagation delay of the semiconductors, and these chips had significant delay (100s of nanoseconds if I remember), and so as a result, the lag between laser positioning and firing was even worse, plus it did not resolve the root issue.

#!g
![CMOS Repeater Board Top](/laser08/repeater-protoboard.webp){CMOS Repeater Board Top View}
![CMOS Repeater Board Bottom](/laser08/repeater-protoboard-back.webp){CMOS Repeater Board Bottom View}
#!g

Following this, I suspected the X-axis motor was insufficient, and thus losing steps. I found a stepper motor on amazon which listed a much higher holding torque. Seeing as it had a huge magnetic core as compared to the current one, I figured it would be much more capable.

![New Stepper Motor](/laser08/amazon-stepper.webp){New Stepper Motor with Higher Torque}

The new motor, being longer but still NEMA 23, fit perfectly into place. There was sufficient clearance behind it in the laser tube area of the cabinet. Having much higher low-end torque, it actually did improve tracking performance when operating at low raster speeds, 100mm/s. It wasn’t perfect, but it was sufficient to start cutting some orders on the laser. We will find the root cause next, but not before going down some design rabbit holes.

#!g
![Updated Schamtic](/laser08/modified-schematic.webp){Updated Schematic as build progressed}
![Finished Laser](/laser08/lights-installed.webp){Finished Laser with Electronics Installed}
![test cut on laser](/laser08/cut-on-laser.webp){Test Cut on Laser}
![test cut close up](/laser08/cut-on-laser-closeup.webp){Closeup of Test Cut on Laser}
#!g

#!g
![](/laser08/fast-raster-demo.webm){Fast Raster Test on Laser}
![](/laser08/slow-raster-demo.webm){Slow Raster Test on Laser}
#!g

[Next: 0.9 Integration](/K400-Updates/09-Integration)
[Previous: 0.7 Enclosure Build](/K400-Updates/07-Enclosure-Build)
[Back to Homepage](/k400-home)
