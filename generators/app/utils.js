import colors from 'ansi-colors';

class Utils {
    hello(log) {
        log(colors.magenta('████████████ ████████████ ████             ████████ ████████████ ████████████'));
        log(colors.magenta('████████████ ████████████ ████             ████████ ████████████ ████████████'));
        log(colors.magenta('████    ████ ████         ████████         ████         ████     ████    ████'));
        log(colors.magenta('████    ████ ████         ████████         ████         ████     ████    ████'));
        log(colors.magenta('    ████████ ████             ████████ ████████         ████     ████████████'));
        log(colors.magenta('    ████████ ████             ████████ ████████         ████     ████████████'));
        log(colors.magenta('████                                                                         '));
        log(colors.magenta('████                                                                         '));
        log(`\n${colors.bold.magenta(`Presto`)}: ${colors.bold.magenta(`P`)}${colors.white(`hp, `)}${colors.bold.magenta(`RE`)}${colors.white(`act, `)}${colors.bold.magenta(`S`)}${colors.white(`ql `)}${colors.bold.magenta(`TO`)}${colors.white(`olkit`)} ${colors.yellow(`v.0.2.0`)}`);
    }
}

export default Utils;