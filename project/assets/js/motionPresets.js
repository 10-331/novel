export const MOTION_PRESETS = {
  enterTwo(params = {}) {
    return [
      {
        type: "enter",
        targets: [
          { id: params.a, to: params.aTo || "left", x: params.aX || 0, y: params.aY || 0 },
          { id: params.b, to: params.bTo || "right", x: params.bX || 0, y: params.bY || 0 }
        ],
        duration: params.duration || 1000
      }
    ];
  },

  addRightAfterShift(params = {}) {
    return [
      {
        type: "move",
        targets: [
          {
            id: params.existing,
            to: params.existingTo || "left",
            x: params.existingX || 0,
            y: params.existingY || 0
          }
        ],
        duration: params.moveDuration || 500
      },
      {
        type: "wait",
        duration: params.waitDuration || 180
      },
      {
        type: "enter",
        targets: [
          {
            id: params.newChar,
            to: params.newTo || "right",
            x: params.newX || 0,
            y: params.newY || 0
          }
        ],
        duration: params.enterDuration || 1000
      }
    ];
  },

  exitTogether(params = {}) {
    return [
      {
        type: "exit",
        targets: params.ids || [],
        duration: params.duration || 700
      }
    ];
  },

  panicMove(params = {}) {
    const target = params.target;
    return [
      { type: "move", targets: [{ id: target, to: "center" }], duration: params.stepDuration || 180 },
      { type: "move", targets: [{ id: target, to: "right" }], duration: params.stepDuration || 180 },
      { type: "move", targets: [{ id: target, to: "left" }], duration: params.stepDuration || 180 },
      { type: "move", targets: [{ id: target, to: "right" }], duration: params.stepDuration || 180 }
    ];
  }
};
