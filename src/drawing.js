const CARD_WIDTH = 30;
const CARD_HEIGHT = 40;
const CARD_RADIUS = 4;

function cardColorForValue(value) {
  if (value >= -2 && value <= -1) {
    return color("purple");
  }
  if (value == 0) {
    return color("cyan");
  }
  if (value >= 1 && value <= 4) {
    return color("green");
  }
  if (value >= 5 && value <= 8) {
    return color("yellow");
  }
  if (value >= 9 && value <= 12) {
    return color("red");
  }
}

function showPile(pile, x, y) {
  // debugText(pile.length, x, y - CARD_HEIGHT - 10);
  if (pile.length === 0) {
    showCard(null, x, y);
    return;
  }
  const yOffset = max(pile.length, 4);
  push();
  pile.slice(-5).forEach((card) => {
    translate(0, -3);
    showCard(card, x, y);
  });
  pop();
}

function showCard(card, x, y) {
  if (!card) {
    noFill();
    strokeWeight(1);
    stroke("lightgrey");
    rect(x, y, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    return;
  }
  fill(card.revealed ? card.color : "grey");
  strokeWeight(1);
  stroke(0);
  rect(x, y, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);

  textSize(20);
  if (card.revealed) {
    fill(255);
    stroke(0);
    strokeWeight(4);
    text(card.value, x, y);
  } else {
    noStroke();
    fill(100);
    text("S", x, y);
  }
}

function setupStyles() {
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  rectMode(CENTER);
}

function debugText(value, x, y) {
  textSize(10);
  noStroke();
  fill(0);
  text(value, x, y);
}

function showGame(game) {
  background(250);

  // Debug
  // debugText(game.cardCount(), 30, 20);

  // Deck
  showPile(game.deck, width / 2 - 50, 70);

  // Discard pile
  showPile(game.discardPile, width / 2 + 50, 70);

  // Picked card
  showCard(game.pickedCard, width / 2, 150);

  // Players
  game.players.forEach((player, playerIndex) => {
    const xOffset = 115 + playerIndex * 250;

    debugText(player.revealedCardSum(), xOffset + 60, 200);

    for (let x = 0; x < PC_COLS; x++) {
      for (let y = 0; y < PC_ROWS; y++) {
        const cardIndex = x * PC_ROWS + y;
        const card = player.cards[cardIndex];
        showCard(card, xOffset + x * 40, 250 + y * 50);
      }
    }
  });
}
