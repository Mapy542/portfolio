#! title: 0.9 - Integration and Testing
#! date: 5/12/2026
#! tags: K400, Laser Cutter, Electronics, Ruida, Stepper Drivers, Water Cooling, oscilloscope, troubleshooting, performance, motion control, acceleration, dynamics, thermals, Lightburn, HMI, DSP, open source, servos, pulley, GT3, timing belt, I2C, repeater, capacitance, bus length, EMI, buck converter, bio-film, CW-5000, heat pump, deadband, stepper motor drivers, DM series, monostable multivibrator, timers
#! description: Troubleshooting performance issues with the motion control system.
#! author: Eli Bukoski
#! image: laser09/ruida-in-place-2.webp

# Upgrades people, upgrades…

With the laser cutter preliminarily working, it was immediately obvious there were some shortfalls with the design. You could chalk it up to this being the first iteration, not being a mechanical engineer, and being a high school student at the time of designing the laser. However the electronics were not perfect either, a major factor I neglected was the importance of dynamics, especially acceleration in motion control and power/thermal performance. The first step was to address some glaring mechanical issues.

As this period is during the integration of all separate subsystems into one final unit, it's often dubbed integration hell, as any interface issues between subsystems are revealed. It can often feel like a slow laborious process of fixing one issue, only to reveal another. Often throwing things at the wall to see what sticks in terms of solutions.

## Mechanics

Firstly, dynamic loading, especially of the gantry, whose sole job it is to move, were not given serious enough consideration. I did not understand how high they would be. As the gantry accelerates, it generates an equal and opposite force on its legs, then is transmitted into the base. My design motif of isolation, separating the gantry from all other subsystems, left it on 4 “spindly” 2040 legs with a high length to cross section ratio. Since they essentially had cantilevered loads at their ends, the legs were quite springy. As a result, the gantry would rock back and forth as the legs bent, especially during the high acceleration of raster engraving.

Another thing working against me was my choice of linear rail. Specifically, as mentioned before,  I overspect the rails to 20mm because I was worried about long term loadability and play within the carriages. For reference, 20mm rail is _huge_ for this application, capable of sustaining loads near 1000 lbs. The gantry weighs in at <20lbs. The rails are huge and because of this, the carriages are _heavy._ This works against me in dynamics since force increases linearly with mass. F = m*a; in physics 1, higher dynamic forces. It also compounds with further effects on limiting speed with drag, wasting motor torque this needless load, and exacerbates timing belt elongation.

Back to the gantry, had I coupled the bed lift and the gantry in 1, then at least the bed would move with the gantry, negating the cut position drift seen particularly in raster. As a first measure I took cutoffs and bound the gantry to the bed-lift to reduce this isolation for side to side motion.

#!g
![Bed Lift to Gantry Bonding Bar](laser09/bedlift-to-gantry-bonding-bar.webp){Cutoff bar tying the bed-lift frame to the gantry.}
![Bonding Bar Installed](laser09/bedlift-to-gantry-bonding-bar_1.webp){Second view of the brace tying the two structures together.}
#!g

I also braced the gantry itself with gussets to make the legs stronger. This forms triangles with the legs, making geometry which converts cross-sectional load into axial tensions and compressions which the extrusion handles much better. It then transfers the force into the base more effectively.  

#!g
![Gantry Gussets Installed](laser09/gantry-gussets.webp){Front gussets added to stiffen the gantry legs.}
![Gusset Load Path Into Base](laser09/gantry-gusset-to-base.webp){Close-up of the gusset carrying load from the gantry into the base.}
#!g


Along those lines, the mounting plate connecting the X Axis cross-bar to the Y axis carriages was floppy due to my poor machining. I dropped counterbores way too far into the plate making the remaining material flexible around the bolt head. As an additional measure I tapped another hole into each place and added a corner gusset bracket to stiffen the mount.

#!g
![X-Axis Mount Before Reinforcement](laser09/x-axis-reinforcement-to-be-added.webp){The flexible mount plate before the added bracket.}
![X-Axis Mount Reinforced](laser09/x-axis-mount-plate-reinforcement.webp){Added corner gusset stiffening the X-axis carriage plate.}
#!g

Funny enough, when the gantry was reinforced, transmitting load to the base, I started to see the base moving. It has the exact same structure, 4 legs with only end points constrained, and so the entire mass of the laser would ever so slightly wobble over its lower shelf and casters. I worried this could cause the bed to also start moving if the whole system was to reach a resonant point. It also falls into the same long legged pit-fall. I stabilized the base with two gussets made from extra 2x6 lumber from the original base build.  

![Base Wood Gussets](laser09/base-wood-gussets.webp){2x6 gussets used to brace the long-legged base.}

Another nice fix was to replace the pulleys on the Y axis transmission shaft. As it distributes the torque of the motor over a 4 ft span to each belt on either side of the y axis, a dual drive setup driven from a single motor, I specced a 1/2” shaft. I knew it needed to be thick enough to resist tangential bending from the large moment placed on it, while true calculations of the minimum requirement would have been better, I went with 1/2” as a “that’s got to be good enough” value. It was, but no one makes 40 tooth GT3 pulleys for a 1/2” shaft. I chose to bore out ones from Mcmaster Carr from 5/16” to 1/2”... on the drill press. I didn’t really have the right tools for the job, but shocker, they were incredibly eccentric when I was done. This caused the belt tension to vary on all of the Y axis belts over the rotation of the shaft, also called camming or cogging. This introduced slop in the axis when the belts were undertensioned.   
I was offered by a co-worker of my dad to remachine the parts on a lathe, fixing the concentricity issue, and the fit tolerances too. (See me hamming the pulleys into position in the gantry build)

Finally, wrapping up the major mechanical fixes, I replaced the X axis belt with a new GT3 9mm wide belt, from its original 6mm width. This helped improve the stiffness of the belt against elongation due to acceleration force. While a step in the right direction, it’s definitely not enough. At the time of writing I’m looking at 20mm width belts newly offered by McMaster Carr. While Gates fiber reinforced GT belts have very low tensile elongation factors on their website, perhaps I mis-understood the metric, or bought knockoff belts, but regardless the belts I had at 8 feet in circumference/length had seriously problematic stretch (5lbs load-\> \~1/16th change in head position). Let’s just say there’s a reason commercial cutters have 20mm timing belts on spans of under 3 feet long.

#!g
![Remachined Y Pulleys](laser09/new-y-pulleys.webp){The new pulleys after being properly reworked for the 1/2" shaft.}
![Pulley Installation on Drive Shaft](laser09/y-drive-shaft-pulley-mounting.webp){Installing one of the corrected pulleys onto the Y-axis transmission shaft.}
![Y Drive Shaft Reassembled](laser09/y-axis-drive-shaft-reassembled.webp){Transmission shaft components reassembled after the pulley fix.}
![New X-Axis Belt Mount](laser09/new-x-belt-mount.webp){Updated X-axis belt hardware for the wider belt.}
#!g

## Electrical

### TOF Sensor Comms

The first electrical upgrade I attempted was installing an I2C repeater halfway down the bus lines going out the VL TOF sensor. Up until this point, the distance sensor has not returned any data to the microcontroller. Using I2c in this application in general is ill-fated regardless, Since it’s an open drain bus, there is an upper limit allowed for bus capacitance. Since a single resistor is pulling up on the line, an RC time constant   

```  
T = R * C  
```

Determines the rise time of the bus voltage, effectively 3 time constants gets to 95% charge. There are multiple specifications for I2c frequency and bandwidth, but a common one is Fast Mode at 100Khz. Because the rise time has to be a small percentage of this short period, the bus capacitance is capped at 10pf, with a 10K resistor commonly used for pullup. Typical parasitic capacitance of wires can limit the bus length to be \~4”. There are other considerations such as length skew, and line impedance when considered as a transmission line, but generally I2c is limited on “on-board” (on 1 PCB) lengths. Everything is close together. 

So obviously, there are issues when I try to operate an I2C bus 6 feet long.  Especially given the environment it’s in, routed in a drag chain right next to high current motor wires, and in the same enclosure as a 20KV arc discharge in the laser; practically an EMI stress tester. My solution was to break the long bus into two smaller ones, by installing a repeater. This reduces the capacitance on each smaller bus, but still passes data. This did improve conditions to the point that some data was actually transferred, but still it was limited, many transmissions failed. The best option seemed to be going back in the future with an entirely different communication method would be better, although differential pair I2c may have been theoretically possible if I sourced and pulled twisted pair cable through the gantry.   

![Finished I2C Repeater](laser09/i2c-extender.webp){The repeater board used to split the long I2C run to the TOF sensor.}

### Water Chiller Replacement

Following this, work essentially paused on upgrades during my first spring semester of college. I’d gotten it really finished and “working” during winter break. Then it sat for a few months. During this time the buck converter in the power section of the water chiller I made broke. I also discovered significant corrosion and bacterial growth because of it in the water reservoir. It has started to deposit bio-film on the tubes and laser itself which can be detrimental to cooling performance. While making a chiller from scratch out of an RV Air conditioner

[See more here](/Personal-Projects/ChillerHighlight)

It was a really neat project, but out of caution I traded it out for a CW-5000 water chiller, a generic Chinese refrigerated water chiller.

It wasn’t perfect out of the box though. It shipped with the ability to do heating or cooling, only using the compressor. Unfortunately, it’s not complex to act entirely like a heat-pump. It can’t pull heat from the air to heat the water, it’s much dumber. Instead the condenser fans are left off while the compressor runs, and a solenoid valve bypasses the expansion capillary tube. Effectively, the compressor is just pumping fluid through the condenser and evaporator with no pressure differential or phase change. As the compressor works, its inefficiency generates heat; coil resistivity and friction. This heat is then pumped through the refrigerant into the water. The compressor is essentially turned into a resistive heater, and while the fans are off a decent amount of heat is lost in the condenser since the air is cooler.

So it has this heating function, and the controller it ships with uses it aggressively. There’s no setpoint deadband or differential. When the water is too warm, it runs in cooling mode until exactly 15 deg C (my setpoint). Then because the evaporator and temperature differential in the reservoir has some inertia, it dips slightly below, triggering the heating mode. This then repeats meaning the compressor never ever shuts off. Maybe there’s a use case for this active seeking in other applications of the cooler, but in my case this is wasteful of energy and compressor working hours. I replaced it with a cheap controller I bought on amazon which has a deadband.

#!g
![Old DIY Chiller Electronics](laser09/chilller-electronics.webp){The failed homemade chiller electronics that pushed me toward a commercial unit.}
![CW-5000 Heat Mode Relay](laser09/relay-added-in-chiller-for-heat-mode.webp){Relay added to enable the compressor during both heating and cooling modes.}
![New Chiller Controller](laser09/water-chiller-temp-controller-front.webp){The replacement controller added so the chiller would use a sane deadband.}
#!g

### Stepper Performance

Finally, this gets to the most important issue. I had hoped mechanical stabilization would fix the deviations I see (below) between the raster image and the cut pass. Furthermore, there are blurry or double line artifacts within the raster image itself.  

#!g
![Large Raster Test](laser09/big-edinboro-raster.webp){A large raster job showing the engraving quality problems.}
![Raster Test Piece](laser09/raster-test.webp){One of the test pieces used while chasing the offset issue.}
![Reduced Raster Offset](laser09/raster-offset-less.webp){A pass where the offset was smaller, but still present.}
![Raster Offset Close-Up](laser09/raster-offset-closeup.webp){Close-up of the double-line artifact inside the raster.}
![Raster and Vector Misalignment](laser09/raster-vector-offset.webp){The raster pass no longer lining up with the vector cut.}
![Raster and Vector Offset Close-Up](laser09/raster-vector-offset-closeup.webp){Detail of the positional mismatch between engraving and cutting.}
#!g

The bigger motor replaced last time on the X axis potentially helped slightly, but the issue was clearly still present. I again wondered if the signal coming off of the nano was too weak to drive the inputs of the stepper motors. I built a new pcb with mosfets to provide the amplification needed, and included optional inverters on each line, since the circuit used N channel mosfets in an open-drain configuration. When the input signal is high, the mosfet turns on pulling the output down to ground, otherwise it leaves the output floating (A resistor pulls it back up; eventually). This is a negation or inversion operation since a high input results in a low output, the extra optional inverter can be used to counteract this if needed for direction signals.

Again this pcb functioned, and improved the signal gain, but did not resolve the issue. Confident now that the issue may not lie in the control signaling, I wondered if the motors or drivers were just failing to keep up. Maybe I just needed more drive power to keep the motor from losing steps? It was weird, as the difference in raster lines was consistent. I'd assume losing steps would be somewhat random in the amount of distance lost. Plus, the deviation was much smaller than a full pole in the motor of 1.8 degrees. Had I known that I should be driving the motor coils in parallel and not series as previously discussed, I could have simply rewired the motor now. It would half the inductance and therefore back EMF (voltage generated in the motor by its velocity; how a generator works). The increased voltage difference between the supply and BEMF would double the current flowing and quadruple the power, assuming the driver could handle it.   
But I did not know this, so I brute forced the same effect by raising the supply voltage. I purchased a high power boost converter to take my 24V supply up to 60V.  

#!g
![Replacement X-Axis Motor](laser09/x-motor.webp){The larger X-axis motor that helped slightly at lower raster speeds.}
![Pulse Amplifier Board](laser09/nano-pulse-amplifier-board.webp){Mosfet-based board built to amplify the Nano step and direction signals.}
![Boost Converter](laser09/boost-converter.webp){Boost converter used to raise the stepper supply from 24V to 60V.}
#!g

This showed promise, the slop was reduced since the motor could hit much higher accelerations. I was able to start producing usable parts on the laser for the wood working business. However the success was short-lived. I mentioned this would increase the power. P \= V^2/Z where we assume the motor has a roughly constant impedance. I tripled the voltage leading to a 9x power increase. However this also lead to 3X current and therefore Ploss \= I^2*Z, or 9x the heat loss produced.The stepper motor drivers were getting so warm, they shut off on overtemperature.

Rather than stop and re-evaluate, I dove into the idea that they just needed better cooling. Say, the laser already has a refrigerated water loop for the laser… Let’s just water cool the stepper drivers!

### Water Cooling Madness 

Disassembling the stepper motor drivers reveals: there is a SOC driver chip doing all the hard work. In fact, it’s an allegro stepper motor driver chip just like that I wanted to replace on the M2 Nano; oh the irony. It’s not all for naught though. The external driver has some nice features like configurable microstepping, and it’s built to handle much higher drive currents and voltages.

It does mean we just need to cool this one chip. I ordered small aluminum waterblocks from amazon and set about milling a pocket into the enclosure to mount the block in.  

#!g
![Stepper Driver PCB Back Side](laser09/back-of-external-stepper-driver-pcb.webp){Back side of the external driver before cutting into the housing.}
![Waterblock Pocket Milling Start](laser09/heatsink-mill.webp){Starting the milling operation for the waterblock pocket.}
![Milling Aftermath](laser09/heatsinkmilling-aftermath.webp){The pile of chips left after opening up the enclosure.}
![Freshly Milled Driver Housing](laser09/heatsink-milled.webp){The driver enclosure immediately after milling the pocket.}
![Cleaned-Up Driver Housing](laser09/heatsink-milled-cleaned-up.webp){Pocket cleaned up and ready for final fit.}
![Waterblock Epoxy Curing](laser09/watercooling-epoxy-drying.webp){The waterblock epoxied in place against the driver IC.}
![Water-Cooled Drivers Ready](laser09/watercooled-drives-ready.webp){Modified drivers reassembled with the waterblocks installed.}
![Coolant Plumbing Added](laser09/stepper-drive-coolant-plumbing.webp){Coolant lines run to the stepper drivers.}
![Water-Cooled Drivers Mounted](laser09/watercooled-drives-mounted.webp){Water-cooled drivers mounted back in the cabinet.}
#!g

Side note, I have no idea what I was doing when taking the photo of the heatsink in the mill. I can assure you, I was not milling a pocket directly into the vice jaws, despite how it looks.

Then the drive could be reassembled, and the water block epoxied into position against the IC with thermal compound between the two. Once it had set for a day, I could mount the drives back into the laser and plumb them into the cooling loop.  

#!g
![Mounted Water-Cooled Drivers](laser09/watercooled-drives-mounted.webp){The modified drivers back in their working position.}
![Driver Coolant Plumbing](laser09/stepper-drive-coolant-plumbing.webp){Coolant plumbing tied into the existing loop.}
#!g

The water cooling did the trick, the drives no longer thermal shutdown, but this introduced another huge issue once the laser was turned on. The drives would go haywire, missing large steps or moving in random directions.  
This is caused by the laser itself, specifically its supply of electricity. While separated by glass, electricity is still coupled into the water, by insulator breakdown, capacitive coupling or other. Since the laser is referenced to earth ground, previously, most of the power was sunk into the metal portions of the water chiller. However I introduced a much closer metal component in the loop. Charge built up on the heatsinks until it broke the insulation of the stepper driver chip and arced into it. This caused erratic behavior and likely damage to the silicon.

This effect was something I’ve experienced before, with the k40 laser. Starting out I had a bucket of water as a cooling reservoir. It would build up charge voltage on it, to the point touching the water would shock me. I added a grounding strap to the bucket to absorb and discharge the voltage. This is also why it’s recommended to use de-ionized water in the cooling loop to limit the conductivity of the water to limit the power loss of the system.

### Trying new stepper drivers

This point finally got me to rethink this whole rabbit hole. I asked for the assistance of a family friend to figure out what was really going on. He brought an oscilloscope and the DM series stepper drivers found on SteppersOnline. We found some issues which may have been contributing to the problem. One, the step pulses generated by the Nano were incredibly short, sub 2 microsecond. This is short enough that the DM stepper driver did not even acknowledge them, likely filtered out by a low-pass. This is fair, it's datasheet specifies minimum on-time to be 4 microseconds or more. This had finally diagnosed the charge buildup from the laser on the water cooled drivers, and we could see from the scope that both my original drivers and the DM series ones were missing steps output by the Nano.  

#!g
![DM Driver Under Test](laser09/dm-series-driver.webp){The DM-series driver used during the follow-up tests.}
![Reworked Nano Drivetrain Setup](laser09/nano-drivetrain.webp){The native M2 Nano pulse output.}
![Baseline Pulse Capture](laser09/old-diy-scope-with-nano-pulsetrain.webp){Attempting to diagnose with a DIY Occiloscope kit.}
![Nano Output Comparison](laser09/m2-nano-pulsetrain.webp){The output through the amp pcb, note RC exponential rise.}
![Original Short Pulse](laser09/2us-pulse.webp){The sub-spec pulse that started the whole diagnosis.}
#!g

At this point, I designed the dual monostable multivibrator in an Arduino using its timers.

[You can read about this here.](/Personal-Projects/Arduino-MMV)

It lengthened the pulses into spec, so we could finally try running the gantry with the DM series steppers.  

#!g
![Monostable Multivibrator Code](laser09/mmv-code-on-laptop.webp){Timer code for the Arduino-based pulse stretcher.}
![Pulse Stretcher Output on Scope](laser09/mmv-output-test-on-scope.webp){Verifying the monostable output on the oscilloscope.}
![Stretched Pulse Width](laser09/6us-pulses.webp){Pulse width stretched into the DM driver's acceptable range.}
![Stretched Pulse Alternate View](laser09/6us-pulses-2.webp){Another capture of the corrected pulse timing.}
#!g

Again the steppers lost position during rastering, but the failure mode was drastically different. The X axis should lose steps by multiple inches each time, showing a total failure during the acceleration stage of motion. With acceleration being hardcoded into the firmware of the M2 Nano, I decided to finally hang up the “budget” towel and go all in on a Ruida DSP controller. Ultimately, while the goal of this project was to build a big laser on a budget, with so much time and money already dedicated to the laser, it _had_ to work eventually. Sunk cost fallacy in mind, I purchased the \~$500 Ruida controller and two big 8A DM series stepper drivers. These drives, while also running incredibly cool, have an active fan built into the heatsink to ensure I did not run into any thermal issues again.

I’m still unsure why the original drivers masked this obvious failure. Perhaps the DM series drivers are “more BEMF aware” and attempt to recog the electrical power with the stepper rotor, or the Allegro chip inside the original drivers missed steppers during the short pulses in acceleration leading to the stepper running just on the edge of its performance envelope while losing some position in the process.  

#!g
![Ruida Controller and DM Drivers](laser09/ruida-and-DM-drivers.webp){The new controller and higher-current DM drivers that finally solved the motion problem.}
![Ruida Mounted in Cabinet](laser09/ruida-mounted-3.webp){The Ruida controller mounted into the crowded cabinet.}
#!g

Regardless, installing the Ruida and new drivers was a breeze, but also a bit of a squeeze into the cabinet. By chance, I’d utilized open drain connections for limit switches and buttons before, so they could be directly connected to the Ruida controller. I did also end up purchasing Lightburn since it was compatible with the Digital Signal Processor as Ruida is termed.

I also eventually printed a mount for the HMI.

![Ruida HMI Mount](laser09/ruida-hmi.webp){The HMI for the Ruida controller.}

I also wrapped up a few final tuning details on the bed lift and focus setup.

#!g
![Bed Leveling Setup](laser09/bed-leveling.webp){Dialing in bed height and nozzle clearance after the control upgrade.}
![Bed Leveling Close-Up](laser09/bed-leveing.webp){Another corner of the bed level against the nozzle.}
![Quarter-Inch Focus Check](laser09/bed-leveing-quarter-inch.webp){Opposite corner of the bed 1/4" higher than the rest.}
#!g

It took less than two hours to wire up and configure the new controller, now with custom acceleration profiles, and it was off to the races. As of writing, 2 years and 1500 cut hours after installing the controller, I haven’t had a single issue with it, although as a personal project I’m developing my own DSP style system as a learning experiment, and to build an open source system for lasers also compatible with servos.


