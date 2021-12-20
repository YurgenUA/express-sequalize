const ErrorTypes = {
  InputData: Symbol("InputData"),
  ServerSide: Symbol("ServerSide"),
};
Object.freeze(ErrorTypes);

class AppError extends Error {
  constructor(errorType, message) {
    super(message);
    this.errorType = errorType;
  }
}


module.exports = { AppError, ErrorTypes};