// Mock for antlr4
const antlr4 = {
  atn: {
    ATN: class ATN {},
    ATNDeserializer: class ATNDeserializer {},
    LexerATNSimulator: class LexerATNSimulator {},
    ParserATNSimulator: class ParserATNSimulator {}
  },
  CommonToken: class CommonToken {},
  CommonTokenStream: class CommonTokenStream {},
  InputStream: class InputStream {},
  Lexer: class Lexer {},
  Parser: class Parser {},
  PredictionContextCache: class PredictionContextCache {},
  Token: {
    EOF: -1
  },
  error: {
    ErrorListener: class ErrorListener {},
    BailErrorStrategy: class BailErrorStrategy {}
  }
};

export default antlr4;
