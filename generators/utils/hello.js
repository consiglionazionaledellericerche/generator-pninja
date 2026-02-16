import colors from 'ansi-colors';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');
export function hello(log, banner = false) {
  banner && log(colors.whiteBright(`
               &&&&&&&&&&$$$x+;;              
           &&&&&&&&&&&&&&&&&&+: :+x           
        &&&&&&&&&&&&&&&&&&&&&&;    .;x        
      &&&&&&&&&&&&&&&&&&&&&&&&x     ..:;      
     &&&&&&&&&&&&&&&&&&&&&&&&&X      .:;;:    
   &&&&&&&&&&&&&&&&&&&&&&&&&&&$          .+   
  &&&&&&&&&&&&&&&&&&&&&&&&&&&&X           .;  
 &&&&&&&&&&&&&&&&&&&&&&&&&&&&&;            .+ 
 &&&&&&&&&&&&&&&&&&&&&&&&&&&&$              : 
&&&&&&&&&xX&&&&&&&&&&&&&&&&&&:    .          +
&&&&&&&&.  :&&&&&&&&&&&&&&&&;     .:;;::.. .:+
&&&&&&&X    :&&&&&&&&&&&&&X.        .;++++++++
&&&&&&&x     .x&&&&&&&&&$;            .:;+++++
&&&&&&&$.      .+X$&$X+:               .:++++$
&&&&&&&&+:                  :.       :;++++x&&
&&&&&&&&&+;.                :+;.  .;+++++x&&&&
 &&&&&&&&&X+;:               ;+++++++++x&&&&& 
 &&&&&&&&&&&x++;;:::::::;;;+++++++++x$&&&&&&& 
  &&&&&&&&&&&&&x++++++++++++++++xX&&&&&&&&&&  
   &&&&&&&&&&&&&&&&&Xxx++xxX$&&&&&&&&&&&&&&   
     &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&     
      &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&      
        &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&        
          &&&&&&&&&&&&&&&&&&&&&&&&&&          
              &&&&&&&&&&&&&&&&&&              
                                              
PPPPPPP   NNN   NNNN III           JJJ         
PPPPPPPPP NNNNN NNNN III           JJJ        
PPP  PPPP NNNNNNNNNN     NNNNNNNN      AAAAAAA
PPPPPPPPP NNNNNNNNNN III NNNNNNNN  JJJ   AAAAA
PPPPPPPP  NNN NNNNNN III NNN  NNNN JJJ AA   AA
PPP       NNN  NNNNN III NNN  NNNN JJJ AAA  AA
PPP       NNN   NNNN III NNN  NNNN JJJ  AAAAAA
//pninja.tech                    JJJJJ        
`));
  log(`\n${colors.bold.whiteBright(`PNinja`)} ${colors.yellow(`${packageJson.version}`)} | Yeoman generator for ${colors.whiteBright(`PHP`)}, ${colors.whiteBright(`SQL`)}, ${colors.whiteBright(`JavaScript`)} modern web applications`);
}
