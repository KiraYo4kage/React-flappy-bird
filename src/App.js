import React, { Component } from 'react';
import { setRafInterval, clearRafInterval } from './util/raf-interval';
import './App.css';

const requireContext = require.context("./flappybird", true, /^\.\/.*\.png$/);
const keys = requireContext.keys();
const images = keys.map(requireContext);
const map = {};


class Bg {
    constructor(config) {
      let canvas = document.getElementById('canvas'),
          ctx = canvas.getContext('2d');
      this.ctx = ctx;
      this.init(config);
    }
    init(config) {
      this.initBg(config);
      config.pipe.forEach( (v) => {
        this.initPipe(v,config.pipespace);
      });
      this.initLand(config);
    }
    initImg(key) {
      return map[key];
    }
    initBg() {
      let img = this.initImg('bg_day');
      this.ctx.drawImage(img,0,0);
    }
    initLand(config) {
      let img = this.initImg('land');
      this.ctx.drawImage(img,config.land,400);
      this.ctx.drawImage(img,config.land + 288,400);
    }
    initPipe(config,pipespace) {
      let img1 = this.initImg('pipe_down');
      let img2 = this.initImg('pipe_up');
      this.ctx.drawImage(img1,config.x,config.y);
      this.ctx.drawImage(img2,config.x,config.y + pipespace.y + 320);
    }
}

class Score {
  constructor(config) {
    config = config || {};
    this.init(config);
  }

  init(config) {
    let canvas = document.getElementById('canvas')
    let ctx = canvas.getContext('2d');
    let scoreString = String(config.score || 0);
    let numDigits = scoreString.length
    let startingPoint = 142 - ((15 * numDigits) / 2)
    for (let i = 0; i < numDigits; i++) {
      let digit = scoreString[i];
      let digitImage = map[`number_score_0${digit}`]
      ctx.drawImage(digitImage, startingPoint + 15 * i, 100)
    }
  }
}

class Bird {
    constructor(config) {
      config = config || {};
      this.init(config);
    }
    init(config) {
      let x = config.x !== undefined ? config.x : 100,
          y = config.y !== undefined ? config.y : 232,
          width = config.width !== undefined ? config.width : 30,
          height = config.height !== undefined ? config.height : 30,
          img = config.img !== undefined ? config.img : 0,
          rotate = config.rotate !== undefined ? config.rotate : 0,
          canvas = document.getElementById('canvas'),
          ctx = canvas.getContext('2d');
      // this.clear(ctx);
      this.ctx = ctx;
      ctx.fillStyle = "#fff";
      // ctx.fillRect(x,y,width,height);
      img = this.img(img);
      rotate ? this.rotate(img,x,y,rotate) : ctx.drawImage(img, x, y);//绘制小鸟
    }
    clear() {
      this.ctx.clearRect(0,0,288,512);
    }
    img(index) {
      return map[`bird2_${index}`];
    }
    rotate(img,x,y,rotate) {
      this.ctx.save();//保存状态
      this.ctx.translate(x + img.width / 2,y + img.height / 2);//设置画布上的(0,0)位置，也就是旋转的中心点
      this.ctx.rotate(rotate*Math.PI/180);
      this.ctx.drawImage(img,-img.width / 2,-img.height / 2);//把图片绘制在旋转的中心点，
      this.ctx.restore();//恢复状态
    }
}

class Hud {
  constructor(config) {
    config = config || {};
    this.init(config);
  }
  init(config) {
    const type = config.type || 'start',
          canvas = document.getElementById('canvas'),
          ctx = canvas.getContext('2d');
    this.ctx = ctx;
    switch (type) {
      case 'start':
        this.drawTitle(this.initImg('title'));
        this.drawContent(this.initImg('tutorial'));
        break;
    
      default:
        break;
    }
  }
  drawTitle(img, x = 55, y = 100) {
    this.ctx.drawImage(img, x, y);
  }
  drawContent(img, x = 87, y = 200) {
    this.ctx.drawImage(img, x, y);
  }
  initImg(key) {
    return map[key];
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: 'yyj',
      frames: 60,//帧数
      ratio: 100/1,//地图比例
      distanceFlown: 0,
      land: 0,//地面位置
      score: 0,
      bestScore: 0,
      pipespace: {//障碍物横纵间距
        x: 118,
        y: 120,
      },
      pipe: [{//障碍物位置
        x: 500,
        y: Math.random() * -260 - 40
      },{
        x: 500 + 118 + 52,
        y: Math.random() * -260 - 40
      },{
        x: 500 + 118 * 2 + 52 * 2,
        y: Math.random() * -260 - 40
      }],
      velocity: 0,//速度
      g: 9.8,//重力加速度
      img: 0,//飞行状态
      pos: {//飞行位置
        top: 232,
        left: 100
      },
      gameover: false,
      introScreen: true,
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }
  componentDidMount() {
    this.preloadImage(this.initCanvas.bind(this));
  }
  componentWillUpdate() {
    // console.log('update');
    if (!this.birdObj) return;
    this.bgObj.init({
      land: this.state.land,
      pipespace: this.state.pipespace,
      pipe: this.state.pipe
    });
    this.scoreObj.init({
      score: this.state.score,
    });
    this.birdObj.init({
      x:this.state.pos.left,
      y:this.state.pos.top,
      img: this.state.img,
      rotate: this.state.velocity < 0 ? -45 : (this.state.velocity === 0 ? 0 : 45)
    });
  }
  preloadImage(callback,arg) {
    keys.forEach((value,index) => {
      let img = new Image();
      img.src = images[index];
      img.onload = () => {
        map[value.replace('./','').replace('.png','')] = img;
        if(Object.keys(map).length === keys.length) callback(arg);
      };
    });
  }
  initCanvas() {
    this.bgObj = new Bg({
      land: this.state.land,
      pipespace: this.state.pipespace,
      pipe: this.state.pipe
    });
    this.hudObj = new Hud();
  }
  initEngine() {//游戏主引擎和操作事件
    window.addEventListener('keyup', this.handleKeyUp);//绑定键盘事件触发拍打翅膀
    window.document.getElementById('canvas').addEventListener('mousedown', this.handleKeyUp);//绑定触摸、点击事件触发拍打翅膀
    this.timer1 = this.setFlyInterval.call(this);//切换翅膀拍动位置
    this.timer2 = this.setRunInterval.call(this);//游戏运行主要方法
  }
  setFlyInterval() {
    return setRafInterval(() => {
      this.setState({
        img: this.state.img < 2 ? this.state.img + 1 : 0
      });
    },100);
  }
  getRandomVerticalDistance() {
    return Math.random() * -260 - 40
  }
  computeScore(distanceFlown, pipeSpace, pipeWidth) {
    const pointLength = pipeSpace + pipeWidth;
    const startingDistance = 240
    const score = Math.floor((distanceFlown - startingDistance) / pointLength);
    return score > 0 ? score : 0;
  }
  setRunInterval() {
    let time = 1 / this.state.frames;
    return setRafInterval(() => {
      let v = this.state.velocity + this.state.g * time;
      let pipe = this.state.pipe;
      if(pipe[0].x >> 0 < -52) {
        pipe.shift();
        pipe.push({
          x: pipe[1].x + this.state.pipespace.x + 52,
          y: this.getRandomVerticalDistance()
        })
      }

      const distanceFlown = this.state.distanceFlown + 2
      const score = this.computeScore(distanceFlown, this.state.pipespace.x, 52);

      this.setState({
        land: (this.state.land - 2) >> 0 <= -288 ? 0 : this.state.land - 2,
        pipe: pipe.map((v) => ({x:v.x - 2, y: v.y})),
        velocity: v,
        pos: {
          top: this.state.pos.top + v * this.state.ratio * time,
          left: this.state.pos.left
        },
        distanceFlown,
        score,
      });
      var groundCollision = this.checkGroundCollision.call(this);
      if(this.state.pos.left + 38 >= this.state.pipe[0].x && this.checkPipeCollision.call(this) || groundCollision){
        clearRafInterval(this.timer1);
        clearRafInterval(this.timer2);
      }
    },time * 1000);
  }
  finishGame() {
    this.setState({
      gameover: true,
      bestScore: Math.max(this.state.score, this.state.bestScore),
    })
  }
  checkGroundCollision() {
    let gameover = false
    if (this.state.pos.top + 38 >= 400) {
      gameover = true;
    }
    gameover && this.finishGame();
    return gameover;
  }
  checkPipeCollision() {
    let gameover = false,
        {left:birdLeft,top:birdTop} = this.state.pos,
        birdPos = {
          top: birdTop + 10,
          bottom: birdTop + 38,
          left: birdLeft + 10,
          right: birdLeft + 38
        },
        pipePos = {};
    for(let i = 0; i < 2; i++){
      let {x,y} = this.state.pipe[i];
      pipePos.top = y + 320;
      pipePos.bottom = y + 320 + this.state.pipespace.y;
      pipePos.left = x;
      pipePos.right = x+52;

      if(birdPos.bottom >= 400){
        console.log(555555);
      }
      if( birdPos.right >= pipePos.left && birdPos.left <= pipePos.right && (birdPos.top <= pipePos.top || //撞在上面管道
          birdPos.bottom >= pipePos.bottom) || //撞在下面管道
          (birdPos.bottom >= 400) //落地
      ){
        gameover = true;
        break;
      }
    }
    gameover && this.finishGame();
    return gameover;
  }
  handleChange(event, key = 'value') {
    if (/\./.test(key)) {
      const baseStateName = key.split('.')[0];
      const childStateName = key.split('.')[1];
      this.setState({
        [baseStateName]: {
          ...this.state[baseStateName],
          [childStateName]: +event.target.value,
        }
      });
      return;
    }
    this.setState({
      [key]: +event.target.value || event.target.value,
    });
  }
  handleKeyUp(event) {
    if(event.keyCode === 38 || event.type === 'mousedown') {
      this.setState({
        velocity: -4
      });
    }
  }
  start = () => {
    if(this.state.velocity) return;
    this.birdObj = new Bird({ x: this.state.pos.left, y: this.state.pos.top, img: this.state.img });//将唯一bird实例birdObj赋予上下文
    this.scoreObj = new Score({
      score: this.state.score,
    });
    this.initEngine();
    this.setState({
      introScreen: false,
    });
  }
  restart = () => {
    this.setState({
      pos: {//飞行位置
        top: 232,
        left: 100
      },
      pipe: [{//障碍物位置
        x: 500,
        y: this.getRandomVerticalDistance()
      }, {
        x: 500 + 118 + 52,
        y: this.getRandomVerticalDistance()
      }, {
        x: 500 + 118 * 2 + 52 * 2,
        y: this.getRandomVerticalDistance()
      }],
      velocity: 0,//速度
      gameover: false,
      score: 0,
      distanceFlown: 0,
    });
    this.initEngine();
  }
  render() {
    const { gameover, pipespace, g } = this.state;
    return (
      <div className="App" >
        <form className="param-form">
          <button onClick={this.restart} type="button">RESTART</button>
          <input value={this.state.value} onChange={(e) => this.handleChange(e, 'value')} />
          pipespace.x:<input type="range" value={pipespace.x} max="300" onChange={(e) => this.handleChange(e, 'pipespace.x')} />
          pipespace.y:<input type="range" value={pipespace.y} max="300" onChange={(e) => this.handleChange(e, 'pipespace.y')} />
          g:<input type="range" value={g} max="20" onChange={(e) => this.handleChange(e, 'g')} />
        </form>
        <div className="game-container">
          {
            gameover ? (
              <div>
                <div className="score-panel">
                  <div className="score">
                    {this.state.score}
                  </div>
                  <div className="best-score">
                    {this.state.bestScore}
                  </div>
                </div>
                <div className="gameover-modal">
                  <div className="restart-button-container">
                    <div className="restart-button" onClick={this.restart}></div>
                  </div>
                </div>
              </div>
            ) : null
          }
          <canvas id="canvas" className="game-content" width="288" height="512" onClick={this.start}></canvas>
          { !this.state.introScreen && !gameover && <div className="score-label">Score</div> }
        </div>
      </div>
    );
  }
}

export default App;
