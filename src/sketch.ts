import p5 from "p5";
import { setupStyles, showGame } from "./drawing";
import { BASIC_STRATEGY, Game, Player } from "./model";

const game = new Game();
let generator: Generator<void>;
let state: "UNSTARTED" | "INIT" | "PLAYING" = "UNSTARTED";

const gameLogic = (p: p5) => {
  if (state === "UNSTARTED") {
    generator = game.initialize(p);
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
};

export const sketch = (p: p5) => {
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

    setupStyles(p);
  };

  p.draw = () => {
    gameLogic(p);
    showGame(p, game);
  };

  p.mousePressed = () => {
    p.redraw();
  };
};

new p5(sketch, document.body);
