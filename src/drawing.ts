import type P5 from "p5";
import { Card, Game, PC_COLS, PC_ROWS } from "./model";

const CARD_WIDTH = 30;
const CARD_HEIGHT = 40;
const CARD_RADIUS = 4;

export function cardColorForValue(value: number): string {
  if (value >= -2 && value <= -1) {
    return "purple";
  }
  if (value == 0) {
    return "cyan";
  }
  if (value >= 1 && value <= 4) {
    return "green";
  }
  if (value >= 5 && value <= 8) {
    return "yellow";
  }
  if (value >= 9 && value <= 12) {
    return "red";
  }
  return "black";
}

function showPile(p: P5, pile: Card[], x: number, y: number) {
  // debugText(pile.length, x, y - CARD_HEIGHT - 10);
  if (pile.length === 0) {
    showCard(p, null, x, y);
    return;
  }
  p.push();
  pile.slice(-5).forEach((card) => {
    p.translate(0, -3);
    showCard(p, card, x, y);
  });
  p.pop();
}

function showCard(p: P5, card: Card | null, x: number, y: number) {
  if (!card) {
    p.noFill();
    p.strokeWeight(1);
    p.stroke("lightgrey");
    p.rect(x, y, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    return;
  }
  if (card.revealed) {
    p.fill(card.color);
  } else {
    p.fill("grey");
  }
  p.strokeWeight(1);
  p.stroke(0);
  p.rect(x, y, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);

  p.textSize(20);
  if (card.revealed) {
    p.fill(255);
    p.stroke(0);
    p.strokeWeight(4);
    p.text(card.value, x, y);
  } else {
    p.noStroke();
    p.fill(100);
    p.text("S", x, y);
  }
}

function debugText(p: P5, value: number, x: number, y: number) {
  p.textSize(10);
  p.noStroke();
  p.fill(0);
  p.text(value, x, y);
}

export function setupStyles(p: P5) {
  p.textFont("system-ui, Arial, sans-serif")
  p.textAlign("center", "center");
  p.textStyle("bold");
  p.rectMode("center");
}

export function showGame(p: P5, game: Game) {
  p.background(250);

  // Debug
  // debugText(p, game.cardCount(), 30, 20);

  // Deck
  showPile(p, game.deck, p.width / 2 - 50, 70);

  // Discard pile
  showPile(p, game.discardPile, p.width / 2 + 50, 70);

  // Picked card
  showCard(p, game.pickedCard, p.width / 2, 150);

  // Players
  game.players.forEach((player, playerIndex) => {
    const xOffset = 115 + playerIndex * 250;

    debugText(p, player.revealedCardSum(), xOffset + 60, 200);

    for (let x = 0; x < PC_COLS; x++) {
      for (let y = 0; y < PC_ROWS; y++) {
        const cardIndex = x * PC_ROWS + y;
        const card = player.cards[cardIndex];
        showCard(p, card, xOffset + x * 40, 250 + y * 50);
      }
    }
  });
}
