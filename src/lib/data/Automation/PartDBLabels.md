#! title: SMD Reel PartDB Labels 
#! date: 7/18/2026
#! tags: automation, controls, process, industrial, hot runner, molding, imm, plastics
#! description: A Twig script to generate labels for SMD reels in a PartDB system.
#! author: Eli Bukoski
#! image: partdb-label/foldover-lable.webp

# PartDB Labels for SMD Reels

## Reels

As I prepared to take on more electronics design project, I planned to stock up on base resistors and capacitors in the 0603 footprint as a standard library. Along with some common ICs and connectors, I planned to replicate the JLCPCB basic part library. This makes some component selection easier when tolerances allow for simple parts to be specified. It also allows for drop-in reusable blocks to come prepared with the components already in stock.

On top of this parts library, I also wanted to have a level of organization for this mass of parts. Being able to reliably verify I have the part on hand, or whether I can make a quick substitution without needing to order a new part is important for quick board turn.

This brings me to the SMD reels. I wanted a way to quickly access and identify SMD passive components which come in tape & reel format. Sorting through a pile of bags of tape can take a lot of time. I found these easy to 3D print SMD reels on Thingiverse. I printed them on a SLA printer, so opted for the spring loaded version over the plastic compliant lever.

[SMD Reels on Thingiverse](https://www.thingiverse.com/thing:3952021)

These reels printed well, without support on the resin printer. However, they are definitely best printed on a typical FDM style printer. The Elephant's foot on the bottom of the latch caused alignment issues before being cleaned up. Also the brittle nature of resin and the thin area where the tape plastic is separated from the tape has caused reels to break when dropped.

The design itself is very nice, although I might work on a future design which latches onto 8020 extrusions, eliminating the need to print a custom rail. Plus, they hold exactly 1000 0603 passive components.

![pile of parts 1](partdb-label/pile-of-parts_1.webp){}

![smd reels 2](partdb-label/smd-reels-2.webp){}

Now with each component in a reel, how do we tell them apart?

## PartDB

I chose to use PartDB as my parts database. It is a free and open source parts database which can be self-hosted. It has a nice web interface for managing parts, and can be used to generate labels for parts. Below is the documentation, there will not a tutorial for setting up or securing a PartDB instance.

[PartDB](https://docs.part-db.de/)

It provides a really easy access to the database, on desktop or mobile. This is critical for making the resistance against keeping inventory up to date as low as possible. The more friction there is, the less likely it will be kept up to date. Plus, it has a Kicad api, so if you fill out information and can rely on the Kicad basic footprint library, you can automatically pull parts from the ParDB database directly into projects.

PartDB allows you to automatically import data from distributors, which LCSC (unofficially supports) does really well. LCSC is a low cost Chinese distributor, tightly coupled with JLCPCB. The API populates parameters about any part you import, resistance, capacitance, voltage, tolerance, and more. This information can be tedious to enter manually, and drives the information laid out on the labels. The more information you can provide, the easier it is to identify a part and make a substitution if needed.

![lcsc import](partdb-label/lcsc-import.webp){}

![parameters lcsc](partdb-label/parameters-lcsc.webp){}

### Labels

PartDB has a built-in label generator which can be used to describe parts or stock locations. It also has some level of automation for batch generating labels. The system to customize data on the labels provides a ton of flexibility, but it is not very readable. It supports a simple placeholder mode, or Twig templating which allows you to access all of the data for a part and do some level of processing on it. I was able to take this customization and build a 2x1 inch label which can fold over the SMD reel. The quick identification parameters, resistance, footprint, voltage, and if the part is "favorite" are on the top of the reel. Down the side of the reel, full part information is provided, including the PN, description, and the QR code linking to the PartDB entry for the part. It's as simple as scanning the QR code, and applying a inventory adjustment like marking the parts as used.


To build these labels, create a template in PartDB which can be used in the future. The first step is to enable Twig Access to your account. It is disabled by default. 
![twig permission](partdb-label/twig-permission.webp){}
Under user settings, enable Twig access for anyone who will be generating labels.

Then you can build the template. Enable Twig on this specific template.
![label menu twig](partdb-label/label-menu-twig.webp){}

Finally add in the code and styling for the label.

Paste this code into the main content body of the label:
```
{% set name = placeholder('[[NAME]]', element) %}
{% set footprint = placeholder('[[FOOTPRINT]]', element)|trim %}
{% set mpn = placeholder('[[MPN]]', element)|trim %}
{% set desc = placeholder('[[DESCRIPTION_T]]', element)|trim %}
{% set params = element.parameters %}
{% set first_param = params|first %}
{% set second_param = params|slice(1, 1)|first %}
{% set last_param = params|last %}
{% set primary_param = null %}
{% set favorite = element.Favorite ?? element.favorite ?? 0 %}

{% for param in params %}
  {% set param_name = param.name|lower %}
  {% if not primary_param and ('resistance' in param_name or 'capacitance' in param_name or 'inductance' in param_name or 'impedance' in param_name or param_name == 'value') %}
    {% set primary_param = param %}
  {% endif %}
{% endfor %}

{% if not primary_param %}
  {% set primary_param = first_param %}
{% endif %}

<div class="reel-label">
  <div class="main-block">
    <div class="qr-cell"><div class="qr-wrap">{{ placeholder('[[BARCODE_QR]]', element)|raw }}</div></div>
    <div class="text-cell">
      <div class="part-name">{{ name }}</div>
      <div class="footprint-line">{% if footprint %}{{ footprint }}{% endif %}{% if mpn and mpn != name %}{% if footprint %} | {% endif %}{{ mpn }}{% endif %}</div>
      <div class="meta-line">{% if desc %}{{ desc }}{% else %}{% for param in params|slice(0, 4) %}{% if not loop.first %} | {% endif %}{{ param.name }}: {{ param.formattedValue }}{% endfor %}{% endif %}</div>
    </div>
  </div>
  <div class="flap-block">
    {% if favorite %}
      <div class="flap-favorite">&#9733;</div>
    {% endif %}
    <div class="flap-footprint">{{ footprint }}</div>
    {% if primary_param %}
      <div class="flap-primary">{{ primary_param.formattedValue }}</div>
    {% endif %}
    {% if second_param and primary_param and second_param.formattedValue != primary_param.formattedValue %}
      <div class="flap-spec">{{ second_param.formattedValue }}</div>
    {% endif %}
    {% if last_param and primary_param and last_param.formattedValue != primary_param.formattedValue and (not second_param or last_param.formattedValue != second_param.formattedValue) %}
      <div class="flap-spec">{{ last_param.formattedValue }}</div>
    {% endif %}
    {% if not primary_param %}
      {% if mpn %}
        <div class="flap-primary">{{ mpn }}</div>
      {% else %}
        <div class="flap-primary">{{ name }}</div>
      {% endif %}
    {% endif %}
  </div>
</div>
```

On the additional styling/css tab, paste this code to format the content of the label.

```css
.reel-label {
  position: relative;
  width: 100%;
  height: 100%;
}

.main-block {
  position: absolute;
  left: 15.8mm;
  right: 0;
  top: 0;
  height: 30mm;
  overflow: hidden;
}

.flap-block {
  position: absolute;
  left: 0;
  top: 0;
  width: 12.0mm;
  height: 30mm;
  border-right: 0.2mm dashed #000;
  padding-right: 0.7mm;
  text-align: center;
  box-sizing: border-box;
}

.flap-favorite {
  position: absolute;
  top: 0;
  left: 0.4mm;
  font-size: 6.2pt;
  font-weight: bold;
  line-height: 1.0;
}

.qr-cell {
  position: absolute;
  right: 0;
  top: 0;
  width: 10mm;
}

.qr-wrap {
  width: 10mm;
  margin-left: auto;
}

.qr-wrap img {
  display: block;
  width: 10mm;
  height: auto;
  min-height: 0 !important;
}

.text-cell {
  position: absolute;
  left: 0.4mm;
  right: 11.6mm;
  top: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.part-name,
.footprint-line,
.meta-line {
  display: block;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
}

.part-name {
  font-size: 7.1pt;
  font-weight: bold;
  line-height: 1.0;
  margin-bottom: 0.7mm;
}

.footprint-line {
  font-size: 5.5pt;
  font-weight: bold;
  margin-bottom: 0.6mm;
}

.meta-line {
  font-size: 4.7pt;
  line-height: 1.08;
}

.flap-footprint {
  font-size: 4.8pt;
  font-weight: bold;
  margin-top: 0.8mm;
  margin-bottom: 0.6mm;
}

.flap-primary {
  font-size: 7.7pt;
  font-weight: bold;
  line-height: 1.0;
  margin-bottom: 0.5mm;
}

.flap-spec {
  font-size: 4.8pt;
  line-height: 1.0;
  margin-bottom: 0.35mm;
}
```

![label menu twig](partdb-label/label-menu-twig.webp){}
![label menu](partdb-label/label-menu.webp){}

![generated label](partdb-label/generated-label.webp){}

Some additional notes:
- This uses `{{ placeholder('[[BARCODE_QR]]', element)|raw }}` instead of the barcode dropdown so the QR can be positioned manually.
- The short fold-over section is on the left side of the label, with the divider on its right edge and the QR anchored to the far right of the main section.
- The main text block is inset from the divider and hard-wrapped so long names and descriptions stay out of the fold area.
- The flap is tuned for passive-style parts and prefers the first value-like parameter (`Resistance`, `Capacitance`, `Inductance`, `Impedance`, or `Value`) before falling back to the first parameter.
- A favorite part adds a small star to the fold-over flap using `element.Favorite` / `element.favorite`.
- For ICs, clone this preset and replace the flap section with MPN, package, and a couple of key electrical limits.

#!g
![foldover lable](partdb-label/foldover-lable.webp){}
![label foldover](partdb-label/label-foldover.webp){}
![list of parts](partdb-label/list-of-parts.webp){}
![part stock example](partdb-label/part-stock-example.webp){}
![parts pile](partdb-label/parts-pile.webp){}
![pile of parts](partdb-label/pile-of-parts.webp){}
![smd reels labeled](partdb-label/smd-reels-labeled.webp){}
![smd reels](partdb-label/smd-reels.webp){}
![usesage example](partdb-label/usesage-example.webp){}
#!g