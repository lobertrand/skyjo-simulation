import type P5 from "p5";
import { cardColorForValue } from "./drawing";
import { p5Instance as p } from "./sketch";
import { LOGGER } from "./logger";

// PC = Player card
export const PC_COLS = 4;
export const PC_ROWS = 3;
export const PC_COUNT = PC_COLS * PC_ROWS;

export class Card {
  value: number;
  revealed: boolean;
  color: P5.Color;

  constructor({
    value,
    revealed = false,
  }: {
    value: number;
    revealed?: boolean;
  }) {
    this.value = value;
    this.revealed = revealed;
    this.color = cardColorForValue(value);
  }

  reveal() {
    this.revealed = true;
  }

  static createMany({ n, value }: { n: number; value: number }) {
    return Array.from({ length: n }, () => new Card({ value }));
  }
}

export class Player {
  name: string;
  // Cards are store in the list by columns, from top to bottom
  // [col1, col1, col1, col2, col2, col2, col3, col3, col3]
  cards: Array<Card | null>;
  strategy: GameStrategy;

  constructor({ name, strategy }: { name: string; strategy: GameStrategy }) {
    this.name = name;
    this.cards = [];
    this.strategy = strategy;
  }

  *play(game: Game) {
    yield* this.strategy.play({ game, player: this });
  }

  hasCards() {
    return this.cards.some(Boolean);
  }

  cardCount() {
    return this.cards.filter(Boolean).length;
  }

  revealedCardSum() {
    return this.cards
      .filter((card) => card && card.revealed)
      .map((card) => (card as Card).value)
      .reduce((acc, c) => acc + c, 0);
  }

  hasRevealedAllCards() {
    return this.cards.filter(Boolean).every((card) => (card as Card).revealed);
  }

  checkFullColumn() {
    const result = {
      hasFullColumn: false,
      fullColumnIndex: -1,
    };
    for (let col = 0; col < PC_COLS; col++) {
      const colOffset = col * PC_ROWS;
      const colValues = this.cards
        .slice(colOffset, colOffset + PC_ROWS)
        .map((card) => (card ? (card.revealed ? card.value : "?") : "?"));
      if (colValues.every((v) => v === colValues[0]) && colValues[0] !== "?") {
        result.hasFullColumn = true;
        result.fullColumnIndex = col;
      }
    }
    return result;
  }
}

export class Game {
  // Top card of piles is the last element of the list
  // We can :
  // - take a peak at it using pile.at(-1)
  // - take it using pile.pop()
  // - add a card on top of it using pile.push()
  deck: Card[] = [];
  discardPile: Card[] = [];
  players: Player[] = [];
  finished: boolean = false;
  pickedCard: Card | null = null;

  constructor() {}

  pickCard(card: Card) {
    this.pickedCard = card;
  }

  takePickedCard() {
    if (this.pickedCard === null) {
      throw new Error("Game.pickedCard is null");
    }
    const temp = this.pickedCard;
    this.pickedCard = null;
    return temp;
  }

  *initialize(): Generator<void> {
    LOGGER.trace("Creating a brand new deck of cards");
    this.deck = [];
    this.discardPile = [];
    for (let value = -1; value <= 12; value++) {
      this.deck.push(...Card.createMany({ value, n: 10 }));
    }
    this.deck.push(...Card.createMany({ value: 0, n: 5 }));
    this.deck.push(...Card.createMany({ value: -2, n: 5 }));

    LOGGER.trace("Shuffling deck");
    this.deck = p.shuffle(this.deck);

    LOGGER.trace("Dealing cards to the players");
    for (const player of this.players) {
      player.cards = [];
    }
    for (let i = 0; i < PC_COUNT; i++) {
      for (const player of this.players) {
        yield;
        player.cards.push(this.deck.pop() as Card);
      }
    }

    yield;
    LOGGER.trace("Each player turns 2 random cards");
    for (const player of this.players) {
      for (let i = 0; i < 2; i++) {
        yield;
        const card = p.random(player.cards.filter((card) => !card?.revealed));
        card.reveal();
      }
    }

    yield;
    LOGGER.trace("One card is turned from the deck to the discard pile");
    const firstCard = this.deck.pop() as Card;
    firstCard.reveal();
    this.discardPile.push(firstCard);
  }

  *play() {
    outerLoop: while (!this.finished && this.deck.length > 0) {
      for (const player of this.players) {
        // Stop if deck is empty
        if (this.deck.length === 0) {
          LOGGER.error("Deck is empty");
          break outerLoop;
        }

        // Stop if player has no cards left
        if (!player.hasCards()) {
          LOGGER.error("No cards left for player", player.name);
          break outerLoop;
        }

        yield;
        // Let player execute their game strategy
        yield* player.play(this);

        // Check if player formed a column of 3 identical cards
        const result = player.checkFullColumn();
        if (result.hasFullColumn) {
          const col = result.fullColumnIndex;
          LOGGER.info("Full column", {
            col,
            name: player.name,
            value: (player.cards[col * PC_ROWS] as Card).value,
          });
          for (let i = 0; i < PC_ROWS; i++) {
            yield;
            const cardIndex = col * PC_ROWS + i;
            LOGGER.trace(player.cards[cardIndex]);
            this.discardPile.push(player.cards[cardIndex] as Card);
            player.cards[cardIndex] = null;
          }
        }

        // Check if player has revealed all their cards
        if (player.hasRevealedAllCards()) {
          LOGGER.info(
            `Player ${player.name} has revealed all of their cards, finishing the tour`
          );
          this.finished = true;
        }
      }
    }

    if (this.finished) {
      const remainingCards = this.players
        .flatMap((player) => player.cards)
        .filter((card) => card && !card.revealed);
      LOGGER.info(`Reavealing ${remainingCards.length} remaining cards`);
      for (const card of remainingCards) {
        yield;
        LOGGER.trace("revealed", card);
        (card as Card).reveal();
      }
      const rank = this.players
        .map((player) => ({ player, points: player.revealedCardSum() }))
        .sort((a, b) => a.points - b.points)
        .map(({ player }) => player);
      LOGGER.info(`Game finished, player ${rank[0].name} won`);
    }
  }

  cardCount() {
    return (
      this.deck.length +
      this.discardPile.length +
      (this.pickedCard ? 1 : 0) +
      this.players.map((p) => p.cardCount()).reduce((acc, i) => acc + i, 0)
    );
  }
}

export class GameStrategy {
  name: string;
  play: ({ game, player }: { game: Game; player: Player }) => Generator<void>;

  constructor({
    name,
    play,
  }: {
    name: string;
    play: ({ game, player }: { game: Game; player: Player }) => Generator<void>;
  }) {
    this.name = name;
    this.play = play;
  }
}

export const BASIC_STRATEGY = new GameStrategy({
  name: "BASIC_STRATEGY",
  play: function* ({ game, player }) {
    // Pick a card from the deck or discard pile
    if ((game.discardPile.at(-1) as Card).value <= 3) {
      // Pick card from discard pile
      game.pickCard(game.discardPile.pop() as Card);
      LOGGER.trace("Card taken from discard pile :", game.pickedCard?.value);
      yield;
    } else {
      // Reveal and pick card from deck
      (game.deck.at(-1) as Card).reveal();
      yield;
      game.pickCard(game.deck.pop() as Card);
      yield;
      if ((game.pickedCard as Card).value <= 5) {
        LOGGER.trace("Card taken from deck :", game.pickedCard?.value);
      } else {
        LOGGER.trace(
          "Card picked from deck is too big to be profitable, discarding it"
        );
        game.discardPile.push(game.takePickedCard());
        yield;
      }
    }

    const indexedCards = player.cards.map((card, index) => ({ card, index }));
    if (game.pickedCard) {
      // Pick a spot to place the chosen card
      // Look at the value of the revealed cards which are greater than the picked card
      const sortedRevealedCards = indexedCards
        .filter(({ card }) => card && card.revealed)
        .filter(
          ({ card }) => (card as Card).value > (game.pickedCard as Card).value
        )
        .sort((a, b) => (b.card as Card).value - (a.card as Card).value);
      LOGGER.trace({ sortedRevealedCards });

      let spotIndex;
      if (
        sortedRevealedCards.length > 0 &&
        (sortedRevealedCards[0].card as Card).value > 3
      ) {
        // If the greatest value is big, we replace it
        spotIndex = sortedRevealedCards[0].index;
      } else {
        // Else we place the card at a free spot
        const nonRevealedCards = indexedCards.filter(
          ({ card }) => card && !card.revealed
        );
        spotIndex = nonRevealedCards[0].index;
      }
      LOGGER.trace("spotIndex", spotIndex);
      LOGGER.trace("spotCard", player.cards[spotIndex]);

      // TODO: Trying to make columns of identical values (only with positive values)

      // // Pick a random card of the player
      // do {
      //   spotIndex = Math.floor(Math.random() * PC_COUNT);
      // } while (!player.cards[spotIndex]);

      // Place the card at its spotIndex
      (player.cards[spotIndex] as Card).reveal();
      game.discardPile.push(player.cards[spotIndex] as Card);
      player.cards[spotIndex] = game.takePickedCard();
    } else {
      // Reveal a card
      const nonRevealedCards = indexedCards.filter(
        ({ card }) => card && !card.revealed
      );
      const spotIndex = nonRevealedCards[0].index;
      LOGGER.info(
        `Revealing player ${player.name} card with value ${
          (player.cards[spotIndex] as Card).value
        }`
      );
      (player.cards[spotIndex] as Card).reveal();
    }
  },
});
