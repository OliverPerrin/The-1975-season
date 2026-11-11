# The 1975 season

A fan-made site for the months when The 1975 sound best: rain on the glass, orange street lamps, wet roads and the first snow.

Live at **https://the1975season.vercel.app**

It is a plain static site. No build step, no dependencies, no framework.

## What is in it

- `index.html`: the home page. A night city seen through a wet, steamed-up window (one WebGL shader, `js/season/weather.js`), with a mood board, a weather-to-song forecast, a night drive with a car radio, the five albums, and a neon sign maker laid over it.
- `rooms.html`: five interactive rooms, one per studio album, nested inside each other. Each room lives in `eras/<album>/`.
- `drive.html`: the night drive by itself.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 4975
```

then visit http://localhost:4975.

## About

Fan-made, for fun. It is not affiliated with the band or their label. Song and album titles belong to their owners. No lyrics are quoted and no music is sampled: every sound is synthesised in the browser, and everything except the album covers and the photographs below is drawn in code.

The five album covers in `assets/covers/` and the site icon (the band's box logo, cropped from the first album's cover) are the copyright of the band and their label. They are shown at small size only to identify the band and each album, and they are not covered by any licence in this repository.

## Photo credits

All 24 photographs in `assets/photos/` come from Wikimedia Commons and are used under the licence shown. They have been resized and recompressed, and the site shows them with a colour grade and crops. Each photograph stays under its own licence, which is separate from the rest of this repository; the ones marked CC BY-SA must be shared under the same licence if you reuse them. The same credits appear in the footer of the site.

| File | Original (links to source) | Author | Licence |
| --- | --- | --- | --- |
| `westminster-through-rain.jpg` | [2016-02 Raindrops on windows Palace of Westminster.jpg](https://commons.wikimedia.org/wiki/File:2016-02_Raindrops_on_windows_Palace_of_Westminster.jpg) | 0x010C | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `snow-under-street-lamp.jpg` | [Snow under a street lamp in Tuntorp 2.jpg](https://commons.wikimedia.org/wiki/File:Snow_under_a_street_lamp_in_Tuntorp_2.jpg) | W.carter | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `green-light-frame-stage.jpg` | [The 1975 - 2019159000032 2019-06-07 Rock am Ring - 0275 - 5DSR0560.jpg](https://commons.wikimedia.org/wiki/File:The_1975_-_2019159000032_2019-06-07_Rock_am_Ring_-_0275_-_5DSR0560.jpg) | Sven Mandel | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `raindrops-and-street-lamps.jpg` | [Raindrops on a window in Brastad 1.jpg](https://commons.wikimedia.org/wiki/File:Raindrops_on_a_window_in_Brastad_1.jpg) | W.carter | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| `misty-woodland-path.jpg` | [Dülmen, Kirchspiel, Neusträßer Bruch -- 2021 -- 9371.jpg](https://commons.wikimedia.org/wiki/File:D%C3%BClmen,_Kirchspiel,_Neustr%C3%A4%C3%9Fer_Bruch_--_2021_--_9371.jpg) | Dietmar Rabich | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `neon-puddle-reflection.jpg` | [DFC 0505 Neon-lit city street at night reflected in a rain puddle colorful signs and lights mirrored on the wet pavement.jpg](https://commons.wikimedia.org/wiki/File:DFC_0505_Neon-lit_city_street_at_night_reflected_in_a_rain_puddle_colorful_signs_and_lights_mirrored_on_the_wet_pavement.jpg) | PattayaPatrol | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `rainy-windscreen-at-night.jpg` | [Noche de lluvia en el falcon (8287204390).jpg](https://commons.wikimedia.org/wiki/File:Noche_de_lluvia_en_el_falcon_(8287204390).jpg) | Juanedc from Zaragoza, España | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| `frosted-trees-in-fog.jpg` | [Dülmen, Kirchspiel, Bäume -- 2021 -- 9366.jpg](https://commons.wikimedia.org/wiki/File:D%C3%BClmen,_Kirchspiel,_B%C3%A4ume_--_2021_--_9366.jpg) | Dietmar Rabich | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `neon-theatre-sign.jpg` | [Teatr Nowy neon sign - night shot, Łódź 15 Więckowskiego Street.jpg](https://commons.wikimedia.org/wiki/File:Teatr_Nowy_neon_sign_-_night_shot,_%C5%81%C3%B3d%C5%BA_15_Wi%C4%99ckowskiego_Street.jpg) | Zorro2212 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `umbrella-walk-in-the-park.jpg` | [A walk in the rain.jpg](https://commons.wikimedia.org/wiki/File:A_walk_in_the_rain.jpg) | Jules Grandgagnage | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `motorway-light-trails.jpg` | [Clapton-in-Gordano MMB 10 M5.jpg](https://commons.wikimedia.org/wiki/File:Clapton-in-Gordano_MMB_10_M5.jpg) | mattbuck | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `wet-leaves-on-pavement.jpg` | [Autumn in 2024.jpg](https://commons.wikimedia.org/wiki/File:Autumn_in_2024.jpg) | Handebahartol | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| `pink-light-frames-brixton.jpg` | [The 1975, Brixton Academy, 10-01-2014 (11888544694).jpg](https://commons.wikimedia.org/wiki/File:The_1975,_Brixton_Academy,_10-01-2014_(11888544694).jpg) | Drew de F Fawkes | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| `snowy-terraced-street.jpg` | [St. James' Street, Wetherby seen in snowfall (27th February 2018).jpg](https://commons.wikimedia.org/wiki/File:St._James%27_Street,_Wetherby_seen_in_snowfall_(27th_February_2018).jpg) | Mtaylor848 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `night-bus-steamed-window.jpg` | [Night bus in the rain (129702454).jpg](https://commons.wikimedia.org/wiki/File:Night_bus_in_the_rain_(129702454).jpg) | Till Krech from Berlin, Germany | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| `park-benches-at-night.jpg` | [In the Park at night, Salvaterra de Miño.jpg](https://commons.wikimedia.org/wiki/File:In_the_Park_at_night,_Salvaterra_de_Mi%C3%B1o.jpg) | Harpagornis | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `neon-square-1945.jpg` | [Esselte-huset 1945.jpg](https://commons.wikimedia.org/wiki/File:Esselte-huset_1945.jpg) | Bo Boësen | Public domain |
| `cornbrook-tram-lines.jpg` | [Cornbrook Manchester, 11-10-2024 1.jpg](https://commons.wikimedia.org/wiki/File:Cornbrook_Manchester,_11-10-2024_1.jpg) | LimeSpiked | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| `snowfall-headlights-mono.jpg` | [Snowy night street - Flickr - kryshen.jpg](https://commons.wikimedia.org/wiki/File:Snowy_night_street_-_Flickr_-_kryshen.jpg) | Mikhail Kryshen from Petrozavodsk, Russia | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) |
| `m60-at-dusk.jpg` | [M60 at Cutler Hill, Failsworth.jpg](https://commons.wikimedia.org/wiki/File:M60_at_Cutler_Hill,_Failsworth.jpg) | Steve Garry from Manchester, United Kingdom | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| `coloured-shadows-stage.jpg` | [The 1975 live in Nottingham 2020.jpg](https://commons.wikimedia.org/wiki/File:The_1975_live_in_Nottingham_2020.jpg) | Jasminewallis24 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `wet-platform-orange-lamps.jpg` | [British Rail Class 195 passing though Heald Green Railway Station.jpg](https://commons.wikimedia.org/wiki/File:British_Rail_Class_195_passing_though_Heald_Green_Railway_Station.jpg) | Benjamin Shaw | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `oxford-street-snowfall.jpg` | [Snowfall on Oxford street - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Snowfall_on_Oxford_street_-_panoramio.jpg) | Alexander Kachkaev | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| `turntable-needle.jpg` | [Marantz turntable, closeup on headshell.jpg](https://commons.wikimedia.org/wiki/File:Marantz_turntable,_closeup_on_headshell.jpg) | Paul Joseph | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
