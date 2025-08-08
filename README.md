# Lysa Arm UI (Angular) – Source
This folder contains the `src/` tree for an Angular app.

## Quick setup
1) Create a new Angular project (Angular 17+ recommended):
```bash
npm i -g @angular/cli
ng new lysa-arm-ui --routing --style=scss
cd lysa-arm-ui
npm i three
```

2) Replace the generated `src/` folder with the `src/` from this package.

3) In `src/app/can-bridge.service.ts`, set the WebSocket URL if needed
(default tries `ws://<browser-host>:81`). If your Sender ESP32 has IP
`192.168.1.60`, hardcode: `ws://192.168.1.60:81/`.

4) Run:
```bash
ng serve --open
```

You should see four joint cards + a simple Three.js viewer.
