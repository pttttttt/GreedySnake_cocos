import { _decorator, Component, Node, input, Input, EventKeyboard, KeyCode, Prefab, instantiate, Vec3, Collider, Collider2D, Contact2DType, PhysicsSystem2D, tweenUtil, Label } from 'cc';
const { ccclass, property } = _decorator;

type positionArr = [number, number]
type directionNumber = 10 | -10 | 0

@ccclass('gameRoot')
export class gameRoot extends Component {
  @property(Node) bg: Node
  @property(Node) foodRoot: Node
  @property(Prefab) foodPrefab: Prefab
  @property(Node) snakeRoot: Node
  @property(Node) wallRoot: Node
  @property(Prefab) bodyPrefab: Prefab
  @property(Node) overRoot: Node
  @property(Prefab) overPrefab: Prefab
  @property(Node) score: Node

  _snakeBodyData: Array<positionArr> = this._getSnakeBodyData([150, 70], 5)
  _snakeBodyDataOrigin: Array<positionArr> = []
  _wallPositionData: Array<positionArr> = [...this._getSnakeBodyData([100, 250], 30), ...this._getSnakeBodyData([250, 100], 30, 'y')]
  _interval: number = .1 // 蛇每次移动的时间间隔
  _direction: { x: directionNumber, y: directionNumber } = { x: 10, y: 0}
  _x: directionNumber // 控制移动方向
  _y: directionNumber
  _foodPosition: positionArr
  _gameStatus: boolean = true
  _score: number = 0

  start() {
    this.newGame()
    this.onKeyDown() // 监听按键按下
  }
  newGame () {
    this._gameStatus = true // 修改游戏状态
    this._score = 0
    this.setScore() // 初始化得分
    this._initDirection() // 初始化移动方向
    this.generateFood() // 生成食物
    this.initSnake() // 初始化蛇
    this.startMoving() // 开始移动
  }
  _gameOver (position: positionArr) { // 游戏结束
    this._gameStatus = false
    this.unschedule(this._advance) // 移动停止
    this._generateNode(this.overRoot, this.overPrefab, [position[0], position[1]]) // 碰撞位置提示
    // setTimeout(() => { // 测试 bug
    //   this._reset()
    //   this.newGame()
    // }, 50);
  }
  _reset () { // 重置节点
    this.snakeRoot.removeAllChildren()
    this.foodRoot.removeAllChildren()
    this.overRoot.removeAllChildren()
  }
  _initDirection () {
    this._x = this._direction.x
    this._y = this._direction.y
  }
  startMoving () { // 控制蛇移动
    this.schedule(this._advance, this._interval)
  }
  _advance () { // 蛇移动 回调
    if (!this._gameStatus) return
    const position = this.snakeRoot.children[0].getPosition()
    position.x += this._x
    position.x = position.x > 490 ? 0 : position.x < 0 ? 490 : position.x
    position.y += this._y
    position.y = position.y > 490 ? 0 : position.y < 0 ? 490 : position.y
    const tmpPosition: positionArr = [position.x, position.y]
    this._insertBodyItem(tmpPosition)
    if (this._judgePositionIsOverlap(tmpPosition) || this._judgePositionIsOverlap(tmpPosition, this._snakeBodyDataOrigin)) { // 游戏结束判定条件
      this._deletedBodyItem()
      this._gameOver(tmpPosition)
      return
    }
    this._snakeBodyDataOrigin.unshift(tmpPosition)
    if (position.x === this._foodPosition[0] && position.y === this._foodPosition[1]) { // 得分
      this._score++
      this.setScore()
      this.generateFood()
      return
    }
    this._deletedBodyItem()
    this._snakeBodyDataOrigin.pop()
  }
  initSnake () { // 初始化身体
    this._snakeBodyDataOrigin = []
    for (let n = this._snakeBodyData.length, i = 0; i < n; i++) {
      this._generateNode(this.snakeRoot, this.bodyPrefab, this._snakeBodyData[i])
      this._snakeBodyDataOrigin[i] = this._snakeBodyData[i]
    }
  }
  onKeyDown () { // 绑定按键事件
    input.on(Input.EventType.KEY_DOWN, this._keyDownCallback, this)
  }
  _keyDownCallback (e: EventKeyboard) { // 按键事件回调
    if (e.keyCode === KeyCode.ENTER && this._gameStatus !== true) { // 重新开始
      this._reset()
      this.newGame()
    }
    if (!this._gameStatus) return
    if ((e.keyCode === KeyCode.KEY_W || e.keyCode === KeyCode.ARROW_UP) && this._y !== -10) { // 控制移动方向
      this._y = 10
      this._x = 0
    } else if ((e.keyCode === KeyCode.KEY_S || e.keyCode === KeyCode.ARROW_DOWN) && this._y !== 10) {
      this._y = -10
      this._x = 0
    } else if ((e.keyCode === KeyCode.KEY_A || e.keyCode === KeyCode.ARROW_LEFT) && this._x !== 10) {
      this._y = 0
      this._x = -10
    } else if ((e.keyCode === KeyCode.KEY_D || e.keyCode === KeyCode.ARROW_RIGHT) && this._x !== -10) {
      this._y = 0
      this._x = 10
    }
    this.unschedule(this._advance)
    this._advance()
    this.startMoving()
  }
  generateFood () { // 生成食物
    const length = this.foodRoot.children.length
    if (length !== 0) {
      this.foodRoot.children[length - 1].removeFromParent()
    }
    this._foodPosition = [this._random(), this._random()]
    if (this._judgePositionIsOverlap(this._foodPosition)) { // 若生成至墙体内则重新生成坐标
      this.generateFood()
      return
    }
    this._generateNode(this.foodRoot, this.foodPrefab, this._foodPosition)
  }
  _random (max: number = 49) { // 随机数
    return Math.floor(Math.random() * max) * 10
  }
  _generateNode (fatherNode: Node, node: Prefab, position: positionArr) { // 生成节点
    const tmpNode = instantiate(node)
    fatherNode.addChild(tmpNode)
    tmpNode.setPosition(...position)
  }
  setScore () { // 更改得分
    const labelComp = this.score.getComponent(Label)
    labelComp.string = `得分：${this._score}`
  }
  _insertBodyItem (position: positionArr) { // 在头部插入一节身体
    const bodyItem = instantiate(this.bodyPrefab)
    this.snakeRoot.insertChild(bodyItem, 0)
    bodyItem.setPosition(...position)
  }
  _deletedBodyItem () { // 移除身体尾端
    const length = this.snakeRoot.children.length
    this.snakeRoot.children[length - 1].removeFromParent()
  }
  _getSnakeBodyData (initialPoint: positionArr = [0, 0], length: number = 5, axis: 'x' | 'y' = 'x') { // 生成坐标数组
    const arr = []
    const index = axis === 'x' ? 0 : 1
    for (let i = 0; i < length; i++) {
      const tmpArr = []
      tmpArr[index] = i * 10 + initialPoint[index]
      tmpArr[1 - index] = initialPoint[1 - index]
      arr[length - i - 1] = tmpArr
    }
    return arr
  }
  _judgePositionIsOverlap (position: positionArr, positionArr: Array<positionArr> = this._wallPositionData) { // 坐标重叠判断
    for (let length = positionArr.length, i = 0; i < length; i++) {
      const item = positionArr[i]
      if (item[0] === position[0] && item[1] === position[1]) {
        return true
      }
    }
    return false
  }
  update(deltaTime: number) {

  }
}


