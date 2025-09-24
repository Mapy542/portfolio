#! title: Peanut Butter Machine
#! date: 9/22/2025
#! tags: automation, robotics, engineering, industrial, peanut butter
#! description: A robotic cell for making and packaging peanut butter dog treats.
#! author: Eli Bukoski
#! image: project-highlights/pbv2closeup.webp

# The Peanut Butter Machine

## V1

The first version of the Peanut Butter Machine was built in using the remains of another robotic assembly cell. Utilizing a Mitsubishi RV-2AJ robot arm, it spanned across a tabletop, and was indented to handle multiple shapes of treat dishes.

This first iteration had quite a few shortcomings:

1. The cycle time was much too long compared to what production wanted. (Learned the desired cycle time after building the machine.)
2. The control of peanut butter did not fully shut off, leading to drips and messes.
3. To flow evenly into the disks, the peanut butter had to be very warm, which made it runnier and more likely to drip.
4. Once the peanut butter was in the disks, it remained liquid for some time. Meaning the angled disk out-feed magazine system did not work.

Given the lack of clear requirements nor budget, it was an interesting challenge to design and build this machine. I learned a lot liquids manipulation.

#!g
![Infeed disk magazine](project-highlights/pbmagazine.webp){Infeed disk magazine. Fresh disks are loaded here.}
![Output disk magazine](project-highlights/pbdisktray_fix.webp){Output disk magazine.}
![Sealed Disks](project-highlights/pbsealeddisks.webp){Sealed disks ready for packaging.}
#!g

![](project-highlights/pbv1timelapse.webm){Time-lapse of the first version of the Peanut Butter Machine.}

## V2

The second version of the Peanut Butter Machine was a complete redesign started by other full-time employees while I was at college. The new system utilized 5x5 plates of disks as in-feed into the system. The robot stayed, but was upgraded with a proper shutoff nozzle and high pressure feed line for the peanut butter.

It was also now 40 degrees Fahrenheit in the room, which helped the peanut butter solidify faster, but we had to implement a lineset heater made from a gutter de-icer cable to keep the peanut butter flowing.

This version of the machine worked much better and faster but still had some shortcomings:

1. The robot had an acceleration profile, but material flow was constant, leading to uneven filling of the disks.
2. The robot had a different acceleration profile based on it's position in the work envelope, leading to inconsistent filling of the disks across the custom palletization-like fill program.

#!g
![V2](project-highlights/pbv2overview.webp){The second version of the Peanut Butter Machine.}
![Robot closeup](project-highlights/pbv2closeup.webp){Output disks from the second version of the Peanut Butter Machine.}
![Pump and heater](project-highlights/pbvsheater.webp){Pump and line heater for the peanut butter.}
#!g

![](project-highlights/pbv2run.webm){Time-lapse of the second version of the Peanut Butter Machine.}
![](project-highlights/pbv2runprelim.webm){Test run of the second version of the Peanut Butter Machine.}
