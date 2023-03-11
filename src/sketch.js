const game = new Game();
let generator = game.initialize();
let state = "INIT";

function setup() {
  createCanvas(600, 400);

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

  frameRate(10);
  // noLoop();

  setupStyles();
}

function mousePressed() {
  redraw();
}

function gameLogic() {
  if (state == "INIT") {
    if (generator.next().done) {
      state = "PLAYING";
      generator = game.play();
    }
  } else if (state == "PLAYING") {
    if (generator.next().done) {
      noLoop();
    }
  }
}

function draw() {
  gameLogic();
  showGame(game);
}
