import type P5 from "p5";
import p5 from "p5";
import { setupStyles, showGame } from "./drawing";
import { BASIC_STRATEGY, Game, Player } from "./model";

const game = new Game();
let generator: Generator<void>;
let state: "UNSTARTED" | "INIT" | "PLAYING" = "UNSTARTED";

export const sketch = (p: P5) => {
  p.setup = () => {
    p.createCanvas(600, 400);

    game.players.push(
      new Player({
        name: "A",
        strategy: BASIC_STRATEGY,
      })
    );
    game.players.push(
      new Player({
        name: "B",
        strategy: BASIC_STRATEGY,
      })
    );

    p.frameRate(10);
    // noLoop();

    setupStyles();
  };

  p.draw = () => {
    if (state === "UNSTARTED") {
      generator = game.initialize();
      state = "INIT";
    } else if (state === "INIT") {
      if (generator.next().done) {
        state = "PLAYING";
        generator = game.play();
      }
    } else if (state === "PLAYING") {
      if (generator.next().done) {
        p.noLoop();
      }
    }

    showGame(game);
  };

  p.mousePressed = () => {
    p.redraw();
  };
};

export const p5Instance = new p5(sketch, document.body);
