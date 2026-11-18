# JapanStations — 川湊メトロ / Kawaminato Metro

A first-person simulator of a **fictional** Japanese subway. Walk through stations, read the signs, wait for a train that runs to a real timetable, board it and ride to the next stop.

Everything — city, operator, lines, stations, shops — is invented. The design language is inspired by real Japanese metros.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Controls

| Key | Action |
|---|---|
| W A S D | Move |
| Mouse | Look (click the view to capture the mouse, Esc to release) |
| Space / Shift | Jump / run |
| M | Route map — pick a station to teleport there |
| F | Fast-forward time ×6 (handy while waiting for a train) |
| R | Respawn at the nearest station |
| ← → or Q E | Turn with the keyboard |

## What's in it

- **4 lines, 18 stations**: the Yanagisuji Line (Y, green, north–south), the Nagisa Line (N, blue, bay to hills), the Akanesuji Line (A, red, a deep diagonal with full-height platform doors) and the Shiokaze Line (S, orange, from the river mouth through the hub, running beside the Akanesuji Line, to the south-east canals).
- **A central station**: Kita-Ōdōri, where two lines meet under the glass-roofed atrium of Kawaminato Station, with an underground shopping street, a plaza with bus and taxi ranks, and space already built for future railways.
- **Distinct stations**: a stadium terminus, a neon nightlife district with a canal, a brick university stop, a port terminus, an elevated suburban terminus, and more.
- **Trains that run themselves** to a timetable, with dwell times, platform screen doors, and turnbacks in sidings beyond each terminus.
- **Live information**: platform departure boards, concourse screens, in-car displays, the HUD and the route map all read the same timetable.

See [CLAUDE.md](CLAUDE.md) and [docs/](docs/) for how it is built.
