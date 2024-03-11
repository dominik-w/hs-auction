// eslint-disable-next-line no-unused-vars
const OFF = 0;
const WARN = 1;
const ERROR = 2;

module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    // All JSDoc comments must be valid.
    'valid-jsdoc': [ERROR, {
      requireReturn: false,
      requireReturnDescription: false,
      requireParamDescription: true,
      prefer: {
        return: 'returns',
      },
    }],

    // Allowed a getter without setter, but all setters require getters.
    'accessor-pairs': [ERROR, {
      getWithoutSet: false,
      setWithoutGet: true,
    }],
    'consistent-return': ERROR,
    'handle-callback-err': WARN,
    'no-mixed-requires': WARN,
    'no-new-require': ERROR,
    'no-process-exit': ERROR,
    'no-console': OFF,
  },
};
