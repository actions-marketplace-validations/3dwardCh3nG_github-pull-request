import * as PromisesModule from 'fs/promises';
import { readFile, writeFile, mkdir } from 'fs/promises';

const promisesWrapper = {
  readFile,
  writeFile,
  mkdir
};

export default promisesWrapper;
