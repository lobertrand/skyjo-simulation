// PC = Player card
const PC_COLS = 4;
const PC_ROWS = 3;
const PC_COUNT = PC_COLS * PC_ROWS;

class Card {
  constructor({ value, revealed = false }) {
    this.value = value;
    this.revealed = revealed;
    this.color = cardColorForValue(value);
  }

  reveal() {
    this.revealed = true;
  }

  static createMany({ n, value }) {
    return Array.from({ length: n }, (x) => new Card({ value }));
  }
}

class Player {
  constructor({ name, strategy }) {
    this.name = name;
    // Cards are store in the list by columns, from top to bottom
    // [col1, col1, col1, col2, col2, col2, col3, col3, col3]
    this.cards = [];
    this.strategy = strategy;
  }

  *play(game) {
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
      .map((card) => card.value)
      .reduce((acc, c) => acc + c, 0);
  }

  hasRevealedAllCards() {
    return this.cards.filter(Boolean).every((card) => card.revealed);
  }

  checkFullColumn() {
    const result = {
      hasFullColumn: false,
      fullColumIndex: -1,
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

class Game {
  constructor() {
    // Top card of piles is the last element of the list
    // We can :
    // - take a peak at it using pile.at(-1)
    // - take it using pile.pop()
    // - add a card on top of it using pile.push()
    this.deck = [];
    this.discardPile = [];
    this.players = [];
    this.finished = false;
    this.pickedCard = null;
  }

  pickCard(card) {
    this.pickedCard = card;
  }

  takePickedCard() {
    const temp = this.pickedCard;
    this.pickedCard = null;
    return temp;
  }

  *initialize() {
    Log.trace("Creating a brand new deck of cards");
    this.deck = [];
    this.discardPile = [];
    for (let value = -1; value <= 12; value++) {
      this.deck.push(...Card.createMany({ value, n: 10 }));
    }
    this.deck.push(...Card.createMany({ value: 0, n: 5 }));
    this.deck.push(...Card.createMany({ value: -2, n: 5 }));

    Log.trace("Shuffling deck");
    this.deck = shuffle(this.deck);

    Log.trace("Dealing cards to the players");
    for (const player of this.players) {
      player.cards = [];
    }
    for (let i = 0; i < PC_COUNT; i++) {
      for (const player of this.players) {
        yield;
        player.cards.push(this.deck.pop());
      }
    }

    yield;
    Log.trace("Each player turns 2 random cards");
    for (const player of this.players) {
      for (let i = 0; i < 2; i++) {
        yield;
        const card = random(player.cards.filter((card) => !card.revealed));
        card.reveal();
      }
    }

    yield;
    Log.trace("One card is turned from the deck to the discard pile");
    const firstCard = this.deck.pop();
    firstCard.reveal();
    this.discardPile.push(firstCard);
  }

  *play() {
    outerLoop: while (!this.finished && this.deck.length > 0) {
      for (const player of this.players) {
        // Stop if deck is empty
        if (this.deck.length === 0) {
          Log.error("Deck is empty");
          break outerLoop;
        }

        // Stop if player has no cards left
        if (!player.hasCards()) {
          Log.error("No cards left for player", player.name);
          break outerLoop;
        }

        yield;
        // Let player execute their game strategy
        yield* player.play(this);

        // Check if player formed a column of 3 identical cards
        const result = player.checkFullColumn();
        if (result.hasFullColumn) {
          const col = result.fullColumnIndex;
          Log.info("Full column", {
            col,
            name: player.name,
            value: player.cards[col * PC_ROWS].value,
          });
          for (let i = 0; i < PC_ROWS; i++) {
            yield;
            const cardIndex = col * PC_ROWS + i;
            Log.trace(player.cards[cardIndex]);
            this.discardPile.push(player.cards[cardIndex]);
            player.cards[cardIndex] = null;
          }
        }

        // Check if player has revealed all their cards
        if (player.hasRevealedAllCards()) {
          Log.info(
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
      Log.info(`Reavealing ${remainingCards.length} remaining cards`);
      for (const card of remainingCards) {
        yield;
        Log.trace("revealed", card);
        card.reveal();
      }
      const rank = this.players
        .map((player) => ({ player, points: player.revealedCardSum() }))
        .sort((a, b) => a.points - b.points)
        .map(({ player }) => player);
      Log.info(`Game finished, player ${rank[0].name} won`);
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

class GameStrategy {
  constructor({ name, play }) {
    this.name = name;
    this.play = play;
  }
}

const BASIC_STRATEGY = new GameStrategy({
  name: "BASIC_STRATEGY",
  play: function* ({ game, player }) {
    // Pick a card from the deck or discard pile
    let pickedCard;
    if (game.discardPile.at(-1).value <= 3) {
      // Pick card from discard pile
      game.pickCard(game.discardPile.pop());
      Log.trace("Card taken from discard pile :", game.pickedCard.value);
      yield;
    } else {
      // Reveal and pick card from deck
      game.deck.at(-1).reveal();
      yield;
      game.pickCard(game.deck.pop());
      yield;
      if (game.pickedCard.value <= 5) {
        Log.trace("Card taken from deck :", game.pickedCard.value);
      } else {
        Log.trace(
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
        .filter(({ card }) => card.value > game.pickedCard.value)
        .sort((a, b) => b.card.value - a.card.value);
      Log.trace({ sortedRevealedCards });

      let spotIndex;
      if (
        sortedRevealedCards.length > 0 &&
        sortedRevealedCards[0].card.value > 3
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
      Log.trace("spotIndex", spotIndex);
      Log.trace("spotCard", player.cards[spotIndex]);

      // TODO: Trying to make columns of identical values (only with positive values)

      // // Pick a random card of the player
      // do {
      //   spotIndex = Math.floor(Math.random() * PC_COUNT);
      // } while (!player.cards[spotIndex]);

      // Place the card at its spotIndex
      player.cards[spotIndex].reveal();
      game.discardPile.push(player.cards[spotIndex]);
      player.cards[spotIndex] = game.takePickedCard();
    } else {
      // Reveal a card
      const nonRevealedCards = indexedCards.filter(
        ({ card }) => card && !card.revealed
      );
      const spotIndex = nonRevealedCards[0].index;
      Log.info(
        `Revealing player ${player.name} card with value ${player.cards[spotIndex].value}`
      );
      player.cards[spotIndex].reveal();
    }
  },
});
