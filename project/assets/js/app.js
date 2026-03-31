/* ===== ビューポート ===== */
.app{
  width:100vw;
  height:100vh;
}

.game-shell{
  width:100%;
  height:100%;
  position:relative;
}

.game-viewport{
  width:100%;
  height:100%;
  overflow:hidden;
  position:relative;
}

/* ===== ステージ ===== */
.game-stage{
  position:absolute;
  top:50%;
  left:50%;
  width:1600px;
  height:900px;
  transform:translate(-50%,-50%) scale(1);
  transform-origin:center;
  overflow:hidden;
  opacity:0;
}

.game-stage.is-ready{
  opacity:1;
}

/* ===== 背景 ===== */
.bg-layer{
  position:absolute;
  inset:0;
}

.bg-layer img{
  position:absolute;
  width:100%;
  height:100%;
  object-fit:cover;
  opacity:0;
  transition:opacity 0.6s ease;
}

.bg-layer img.active{
  opacity:1;
}

/* ===== キャラ ===== */
.char-layer img{
  position:absolute;
  bottom:-28px;
  left:50%;
  transform:translateX(-50%) scale(var(--char-scale,1));
  transform-origin:bottom center;
  transition:all 0.6s ease;
  display:none;
}

.char-layer img.fade-in{
  animation:fadeIn 1s forwards;
}

.char-layer img.fade-out{
  animation:fadeOut 0.6s forwards;
}

@keyframes fadeIn{
  from{opacity:0;}
  to{opacity:1;}
}

@keyframes fadeOut{
  from{opacity:1;}
  to{opacity:0;}
}

/* ===== UI全体 ===== */
.ui{
  position:absolute;
  bottom:60px;
  width:100%;
}

/* ===== 名前 ===== */
.name-row{
  width:920px;
  max-width:92vw;
  margin:0 auto;
  display:flex;
  flex-direction:column;
  gap:2px;
}

#nameMain{
  font-size:26px;
  color:#fff;
}

#nameSub{
  font-size:14px;
  color:#aaa;
}

/* ===== 線 ===== */
.dialogue-line-image{
  width:920px;
  max-width:92vw;
  margin:6px auto 10px;
  height:2px;
  background:rgba(255,255,255,0.3);
  transform:translateY(-6px);
}

/* ===== テキストエリア（ここが本体） ===== */
.text-row{
  width:100%;
  max-width:none;
  display:flex;
  justify-content:center;
}

.dialogue-text{
  width:920px;
  max-width:92vw;
  margin:0 auto;

  font-size:26px;
  line-height:1.7;
  color:#fff;

  /* 3行固定 */
  height:calc(1.7em * 3);
  overflow:hidden;

  padding:0 24px;

  white-space:pre-wrap;
  word-break:break-word;
}

/* ===== ▼インジケータ ===== */
#nextIndicator{
  position:absolute;
  right:calc(50% - 460px);
  bottom:0;
  opacity:0;
}

#nextIndicator.is-ready{
  opacity:1;
  animation:float 1.2s infinite ease-in-out;
}

@keyframes float{
  0%{transform:translateY(0);}
  50%{transform:translateY(6px);}
  100%{transform:translateY(0);}
}

/* ===== モバイル ===== */
@media screen and (max-width:768px){

  .game-stage{
    width:1600px;
    height:900px;
  }

  .name-row,
  .dialogue-line-image{
    width:92vw;
  }

  .dialogue-text{
    width:92vw;
    font-size:22px;
    padding:0 16px;
  }

  #nextIndicator{
    right:16px;
  }
}
