#! title: SMD Reel PartDB Labels 
#! date: 7/18/2026
#! tags: automation, controls, process, industrial, hot runner, molding, imm, plastics
#! description: A Twig script to generate labels for SMD reels in a PartDB system.
#! author: Eli Bukoski
#! image: partdb-labels/foldover-label.webp

# PartDB Labels for SMD Reels

## Reels

As I prepared to take on more electronics design project, I planned to stock up on base resistors and capacitors in the 0603 footprint as a standard library. Along with some common ICs and connectors, I planned to replicate the JLCPCB basic part library. This makes some component selection easier when tolerances allow for simple parts to be specified. It also allows for drop-in reusable blocks to come prepared with the components already in stock.

On top of this parts library, I also wanted to have a level of organization for this mass of parts. Being able to reliably verify I have the part on hand, or whether I can make a quick substitution without needing to order a new part is important for quick board turn.

This brings me to the SMD reels. I wanted a way to quickly access and identify SMD passive components which come in tape & reel format. Sorting through a pile of bags of tape can take a lot of time. I found these easy to 3D print SMD reels on Thingiverse. I printed them on a SLA printer, so opted for the spring loaded version over the plastic compliant lever.

[SMD Reels on Thingiverse](https://www.thingiverse.com/thing:3952021)

These reels printed well, without support on the resin printer. However, they are definitely best printed on a typical FDM style printer. The Elephant's foot on the bottom of the latch caused a bit of alignment before being cleaned up. Also the brittle nature of resin and the thin area where the tape plastic is separated from the tape has caused reels to break when dropped.

The design itself is very nice, although I might work on a future design which latches onto 8020 extrusions, eliminating the need to print a custom rail. Plus, they hold exactly 1000 0603 passive components.

![pile of parts 1](partdb-label/pile-of-parts_1.webp){}

![smd reels 2](partdb-label/smd-reels-2.webp){}

Now with each component in a reel, how do we tell them apart?

## PartDB

I chose to use PartDB as my parts database. It is a free and open source parts database which can be self-hosted. It has a nice web interface for managing parts, and can be used to generate labels for parts. Below is the documentation, there will not a tutorial for setting up or securing a PartDB instance.

[PartDB](https://docs.part-db.de/)

It provides a really easy access to the database, on desktop or mobile. This is critical for making the resistance against keeping inventory up to date as low as possible. The more friction there is, the less likely it will be kept up to date. Plus, it has a Kicad api, so if you fill out information and can rely on the Kicad basic footprint library, you can automatically pull parts from the ParDB database directly into projects.

PartDB allows you to automatically import data from distributors, which LCSC (unofficially supports) does really well. LCSC is a low cost Chinese distributor, tightly coupled with JLCPCB. The API populates parameters about any part you import, resistance, capacitance, voltage, tolerance, and more. This information can be tedious to enter manually, and drives the information laid out on the labels. The more information you can provide, the easier it is to identify a part and make a substitution if needed.

### Labels

PartDB has a built-in label generator which can be used to describe parts or stock locations. It also has some level of automation for batch generating labels. The system to customize data on the labels provides a ton of flexibility, but it is not very readable. It supports a simple placeholder mode, or Twig templating which allows you to access all of the data for a part and do some level of processing on it. I was able to take this customization and build a 2x1 inch label which can fold over the SMD reel. The quick identification parameters, resistance, footprint, voltage, and if the part is "favorite" are on the top of the reel. Down the side of the reel, full part information is provided, including the PN, description, and the QR code linking to the PartDB entry for the part. It's as simple as scanning the QR code, and applying a inventory adjustment like marking the parts as used.


#!g
![foldover lable](partdb-label/foldover-lable.webp){}
![generated label](partdb-label/generated-label.webp){}
![label foldover](partdb-label/label-foldover.webp){}
![label menu twig](partdb-label/label-menu-twig.webp){}
![label menu](partdb-label/label-menu.webp){}
![lcsc import](partdb-label/lcsc-import.webp){}
![list of parts](partdb-label/list-of-parts.webp){}
![parameters lcsc](partdb-label/parameters-lcsc.webp){}
![part stock example](partdb-label/part-stock-example.webp){}
![parts pile](partdb-label/parts-pile.webp){}
![pile of parts](partdb-label/pile-of-parts.webp){}
![smd reels labeled](partdb-label/smd-reels-labeled.webp){}
![smd reels](partdb-label/smd-reels.webp){}
![twig permission](partdb-label/twig-permission.webp){}
![usesage example](partdb-label/usesage-example.webp){}
#!g