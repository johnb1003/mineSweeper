var difficulty = 'difficulty-0';
var difficultyArray = [8, 10, 13];
var game;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

$(document).ready( () => {
    $('.difficulty-button').click( (e) => {
        if(!$(e.target).hasClass('active-difficulty')) {
            $(`#${difficulty}`).removeClass('active-difficulty');
            $(e.target).addClass('active-difficulty');
            difficulty = $(e.target).attr('id');
        }
    });

    $('#start-game-button').click( async () => {
        let diff = parseInt(difficulty.match(/(\d+)/));
        let dimensions = difficultyArray[diff];
        game = await new Minesweeper(dimensions);
        game.init();
    });

    $('#play-again-button').click( async () => {
        $('#postgame').css('display', 'none');
        $('#pregame').css('display', 'flex');
        game = null;
    });
});


class Minesweeper {
    constructor(dimension) {
        this.dimensions = dimension;
        this.pixels = $('#minesweeper').width();
        this.blockPixels = this.pixels / this. dimensions;
        this.model = [];
        this.clicked = {};
        this.mines = {};
        this.flags = {};
        this.numMines = Math.max(Math.floor((parseInt(dimension) * parseInt(dimension)) / 10), dimension);
        this.numDigs = 0;
        this.container = '#minesweeper';
        this.overlay = '#overlay';
        this.pregame = '#pregame';
        this.postgame = '#postgame';
        this.resultTitle = '#result-title';
        this.resultMessage = '#result-message';
        this.shovel = '#shovel';
        this.flag = '#flag';
        this.tool = 'shovel';
        this.html = '';
        this.isLive = true;

        // MODEL KEYS ==> (0-8 = num mines around, 9 = MINE)
        for(let i=0; i<this.dimensions; i++) {
            this.model.push(new Array(this.dimensions).fill(0));
        }

        for(let i=0; i<this.dimensions; i++) {
            this.clicked[i.toString()] = [];
            this.mines[i.toString()] = [];
            this.flags[i.toString()] = [];
        }
    }

    init() {
        console.log(`numMines = ${this.numMines}`);
        for(let i=0; i<this.numMines; i++) {
            this.addRandomMine();
        }

        $(this.container).css('grid-template-rows', `repeat(${this.dimensions}, 1fr)`);
        $(this.container).css('grid-template-columns', `repeat(${this.dimensions}, 1fr)`)

        $(this.shovel).addClass('active-tool');

        $(this.shovel).click( (e) => {
            let element = e.target;
            if($(element).attr('id') != 'shovel') {
                element = $(e.target).parent();
            }

            if(!$(element).hasClass('active-tool')) {
                $(element).addClass('active-tool')
                this.tool = 'shovel';
            }
            $(this.flag).removeClass('active-tool');
        });

        $(this.flag).click( (e) => {
            let element = e.target;
            if($(element).attr('id') != 'flag') {
                element = $(e.target).parent();
            }

            if(!$(element).hasClass('active-tool')) {
                $(element).addClass('active-tool')
                this.tool = 'flag';
            }
            $(this.shovel).removeClass('active-tool');
        });

        $(this.pregame).css('display', 'none');
        $(this.overlay).css('display', 'none');

        this.updateHTML();
    }

    reset() {

    }

    async mineClicked(x, y) {
        this.isLive = false;

        let minesArr = [];

        for(let i=0; i<this.dimensions; i++) {
            this.mines[i.toString()].forEach(element => {
                console.log(`Mine at: ${i}, ${element}`);
                if(i != x || element != y) {
                    console.log(`Added mine: ${i}, ${element}`);
                    minesArr.push([i, element]);
                }
            });
        }

        // Explode clicked mine first
        await this.explodeMine(x, y);
        await sleep(150);

        // Explode rest of mines
        for(let i=0; i<minesArr.length; i++) {
            await this.explodeMine(minesArr[i][0], minesArr[i][1]);
            await sleep(150);
        }

        this.gameOver();
    }

    async explodeMine(x, y) {
        $(`#${x}-${y}`).addClass('mine');
        $(this.container+'-container').addClass('shake');
        await sleep(200);
        $(this.container+'-container').removeClass('shake');
    }

    async gameOver() {
        this.isLive = false;
        await sleep(200);

        $(this.resultTitle).text('Game Over');
        $(this.resultMessage).text('You hit a mine!');
        $(this.postgame).css('display', 'flex');
        $(this.overlay).css('display', 'flex');
    }

    async victory() {
        this.isLive = false;
        await sleep(200);

        $(this.resultTitle).text('Victory!');
        $(this.resultMessage).text('You cleared all the mines');
        $(this.postgame).css('display', 'flex');
        $(this.overlay).css('display', 'flex');
    }

    addRandomMine() {
        let x = Math.floor(Math.random() * this.dimensions);
        let y = Math.floor(Math.random() * this.dimensions);
        while(this.mines[x.toString()].includes(y)) {
            x = Math.floor(Math.random() * this.dimensions);
            y = Math.floor(Math.random() * this.dimensions);
        }
        this.mines[x.toString()].push(y);
        this.model[x][y] = 9;
        console.log(`Mine added.`);

        for(let i=x-1;i<this.dimensions && i<x+2; i++) {
            for(let j=y-1;j<this.dimensions && j<y+2; j++) {
                if((i<0 || j<0) || this.model[i][j] === 9) {
                    continue;
                }
                this.model[i][j]++;
            }
        }
    }

    swapFlag(x, y) {
        if(this.flags[x.toString()].includes(y)) {
            this.flags[x.toString()].splice(this.flags[x.toString()].indexOf(y), 1);
        }
        else {
            this.flags[x.toString()].push(y);
        }
    }

    async updateHTML() {
        this.html = '';
        for(let i=0; i<this.dimensions; i++) {
            for(let j=0; j<this.dimensions; j++) {
                let classes = this.getClasses(i, j);
                let number = this.clicked[i.toString()].includes(j) ? this.model[i][j].toString() : '';
                this.html += `<div class="${classes}" id="${i}-${j}">${number}</div>`;
            }
        }

        await $(this.container).html(this.html);

        $('.active-block').click( (e) => {
            let id = $(e.target).attr('id');
            let coords = id.split('-');
            console.log(`Clicked: (${coords[0]}, ${coords[1]})`);
            this.blockClicked(parseInt(coords[0]), parseInt(coords[1]));
        });

        if(this.numDigs >= (this.dimensions * this.dimensions) - this.numMines) {
            this.victory();
        }
    }

    getClasses(x, y) {
        let classes = '';
        if(this.clicked[x.toString()].includes(y)) {
            classes += 'inactive-block';
        }
        else {
            classes += 'active-block';
            if(this.flags[x.toString()].includes(y)) {
                classes += ' flagged';
            }
        }
        return classes;
    }

    blockClicked(x, y) {
        if(this.isLive) {
            if(this.tool === 'shovel') {
                console.log(`Tool = shovel`);
                // Block is a mine
                if(this.mines[x.toString()].includes(y)) {
                    console.log(`MINE!`);
                    this.mineClicked(x, y);
                    return;
                }
                this.numDigs++;
                this.clicked[x.toString()].push(y);
            }
            else if(this.tool === 'flag') {
                console.log(`Tool = flag`);
                this.swapFlag(x, y);
            }
            // UPDATE HTML
            this.updateHTML();
        }
    }
}