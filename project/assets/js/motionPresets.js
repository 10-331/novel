export const MOTION_PRESETS = {
  enterTwo(params) {
    return [
      {
        type: "enter",
        targets: [
          { id: params.a, to: "left" },
          { id: params.b, to: "right" }
        ],
        duration: 1000
      }
    ];
  },

  addRightAfterShift(params) {
    return [
      {
        type: "move",
        targets: [
          { id: params.existing, to: "left" }
        ],
        duration: 500
      },
      {
        type: "wait",
        duration: 180
      },
      {
        type: "enter",
        targets: [
          { id: params.newChar, to: "right" }
        ],
        duration: 1000
      }
    ];
  },

  exitTogether(params) {
    return [
      {
        type: "exit",
        targets: params.ids,
        duration: 700
      }
    ];
  },

  panicMove(params) {
    return [
      { type: "move", targets: [{ id: params.target, to: "center" }], duration: 180 },
      { type: "move", targets: [{ id: params.target, to: "right" }], duration: 180 },
      { type: "move", targets: [{ id: params.target, to: "left" }], duration: 180 },
      { type: "move", targets: [{ id: params.target, to: "right" }], duration: 180 }
    ];
  }
};