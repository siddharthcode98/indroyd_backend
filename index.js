const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const express = require("express");

const app = express();

const Server = http.createServer(app);
app.use(cors);

const io = socketIo(Server, {
  cors: {
    origin: "http://localhost:5173",
    method: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

const questions = [
  {
    category: "film_and_tv",
    correctAnswer: "Frank Capra",
    difficulty: "hard",
    id: "622a1c367cc59eab6f95038c",
    incorrectAnswers: ["Orson Welles", "John Ford", "Howard Hawks"],
    isNiche: false,
    question: {
      text: "Who directed the 1946 classic 'It's A Wonderful Life'?",
    },
    regions: [],
    tags: ["film", "christmas", "film_and_tv"],
    type: "text_choice",
  },
  {
    category: "geography",
    correctAnswer: "The Bronx ",
    difficulty: "hard",
    id: "623386af62eaad73716a8ceb",
    incorrectAnswers: ["Brooklyn", "Staten Island", "The Jersey Shore"],
    isNiche: false,
    question: {
      text: "Which Borough of New York is northeast of and adjacent to Manhattan?",
    },
    regions: [],
    tags: ["new_york", "cities", "usa", "geography"],
    type: "text_choice",
  },
  {
    category: "history",
    correctAnswer: "1990",
    difficulty: "medium",
    id: "62611f7b4b176d54800e3d5c",
    incorrectAnswers: ["1984", "1994", "1999"],
    isNiche: false,
    question: { text: "When did the demolition of the Berlin wall begin?" },
    regions: [],
    tags: ["events", "cold_war", "germany", "history"],
    type: "text_choice",
  },
  {
    category: "food_and_drink",
    correctAnswer: "Red wine",
    difficulty: "medium",
    id: "639898485c9a75021f310472",
    incorrectAnswers: ["White wine", "Rosé wine", "Sparkling wine"],
    isNiche: false,
    question: {
      text: "What type of wine is traditionally used to make sangria?",
    },
    regions: [],
    tags: ["food_and_drink", "wine", "drink"],
    type: "text_choice",
  },
  {
    category: "geography",
    correctAnswer: "Zürich",
    difficulty: "easy",
    id: "62602d7e4b176d54800e3c9c",
    incorrectAnswers: ["Paris", "Prague", "Barcelona"],
    isNiche: false,
    question: { text: "Which of these cities is in Switzerland?" },
    regions: [],
    tags: ["cities", "europe", "geography"],
    type: "text_choice",
  },
  {
    category: "music",
    correctAnswer: "The Who",
    difficulty: "medium",
    id: "622a1c397cc59eab6f950c27",
    incorrectAnswers: ["Deep Purple", "Travis", "Spandau Ballet"],
    isNiche: false,
    question: {
      text: "Which English rock band released the album 'My Generation'?",
    },
    regions: [],
    tags: ["music"],
    type: "text_choice",
  },
  {
    category: "science",
    correctAnswer: "hair and scalp",
    difficulty: "hard",
    id: "622a1c377cc59eab6f95046e",
    incorrectAnswers: ["angels", "the ecology of plant communities", "sleep"],
    isNiche: false,
    question: { text: "What is Trichology the study of?" },
    regions: [],
    tags: ["science"],
    type: "text_choice",
  },
  {
    category: "arts_and_literature",
    correctAnswer: "Jack Vance",
    difficulty: "hard",
    id: "622a1c397cc59eab6f950eb5",
    incorrectAnswers: [
      "H. P. Lovecraft",
      "Edgar Rice Burroughs",
      "Ursula K. Le Guin",
    ],
    isNiche: false,
    question: { text: "Which author wrote 'Planet of Adventure'?" },
    regions: [],
    tags: ["arts_and_literature"],
    type: "text_choice",
  },
  {
    category: "arts_and_literature",
    correctAnswer: "Yanka Kupala",
    difficulty: "hard",
    id: "622a1c397cc59eab6f950def",
    incorrectAnswers: [
      "Nikolai Gogol",
      "Vladimir Nabokov",
      "Henryk Sienkiewicz",
    ],
    isNiche: false,
    question: { text: "Which author wrote 'On Paths of Life'?" },
    regions: [],
    tags: ["arts_and_literature"],
    type: "text_choice",
  },
  {
    category: "arts_and_literature",
    correctAnswer: "Woolf",
    difficulty: "medium",
    id: "6471e4297206d7c314606f77",
    incorrectAnswers: ["Austen", "Brontë", "Christie"],
    isNiche: false,
    question: {
      text: "What surname did the writer, born Adeline Virginia Stephen, publish her novels under?",
    },
    regions: [],
    tags: ["authors", "literature", "arts_and_literature"],
    type: "text_choice",
  },
];

const rooms = {};

io.on("connection", (socket) => {
  //console.log("a user connected");

  socket.on("joinRoom", (room, name) => {
    socket.join(room);
    io.to(room).emit("message", `${name} has joined the game`);
    if (!rooms[room]) {
      rooms[room] = {
        players: [] || Array(10),
        currentQuestion: null,
        correctAnswer: null,
        questionTimeout: null,
        shouldAskNewQuestion: true,
      };
    }
    rooms[room].players.push({ id: socket.id, name });
    if (!rooms[room].currentQuestion) {
      askNewQuestion(room);
    }
  });
  socket.on("submitAnswer", (room, answer) => {
    const currentPlayer = rooms[room].players.find(
      (player) => player.id === socket.id
    );
    if (currentPlayer) {
      const correctAnswer = rooms[room].correctAnswer;
      const isCorrect = correctAnswer !== null && correctAnswer === answer;
      currentPlayer.score = isCorrect
        ? (currentPlayer.score || 0) + 1
        : (currentPlayer.score || 0) - 1;
      clearTimeout(rooms[room].questionTimeout);
      io.to(room).emit("answerResult", {
        playerName: currentPlayer.name,
        isCorrect,
        correctAnswer,
        scores: rooms[room].players.map((player) => ({
          name: player.name,
          score: player.score || 0,
        })),
      });
      const winnerThresold = 6;
      const winner = rooms[room].players.find(
        (player) => (player.score || 0) >= winnerThresold
      );
      if (winner) {
        io.to(room).emit("gameOver", { winner: winner.name });
        delete rooms[room];
      } else {
        askNewQuestion(room);
      }
    }
  });
  socket.on("disconnect", () => {
    for (const room in rooms) {
      rooms[room].players = rooms[room].players.filter(
        (player) => player.id !== socket.id
      );
    }
    //console.log("a user disconnected");
  });
});

function askNewQuestion(room) {
  if (rooms[room].players.length == 0) {
    clearTimeout(rooms[room].questionTimeout);
    delete rooms[room];
    return;
  }
  const randomIndex = Math.floor(Math.random() * questions.length);

  const question = questions[randomIndex];
  rooms[room].currentQuestion = question;
  //const correctAnswer = question.correctAnswer;
  rooms[room].correctAnswer = question.correctAnswer;
  rooms[room].shouldAskNewQuestion = true;
  io.to(room).emit("newQuestion", {
    question: question.question.text,
    answer: question.correctAnswer,
    options: [...question.incorrectAnswers, question.correctAnswer],
    timer: 10,
  });
  rooms[room].questionTimeout = setInterval(() => {
    io.to(room).emit("answerResult", {
      playerName: "no one",
      isCorrect: false,
      correctAnswer: question.correctAnswer,
      scores: rooms[room].players.map((player) => ({
        name: player.name,
        score: player.score || 0,
      })),
    });
    askNewQuestion(room);
  }, 10000);
}

Server.listen(PORT, () => {
  console.log(`server running at ${PORT}`);
});
