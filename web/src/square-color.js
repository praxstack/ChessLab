// a1 is a dark square, so a square is dark when its file index (a = 0) plus its rank number is odd.
export const isDarkSquare = square => (square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 1;
