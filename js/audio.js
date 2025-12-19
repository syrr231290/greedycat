class BGMManager {
  constructor() {
    this.audio = new Audio();
    this.audio.src = '../assets/audio/bgm.mp3'; // 确认文件路径正确
    this.audio.loop = true; // 循环播放
    
    // 初始化状态：默认关闭背景音乐（强制不自动播放）
    this.isEnabled = false; // 初始强制关闭，无视本地存储
    this.hasUserInteraction = false; // 标记用户是否有过页面交互
    this.volume = 0.7; // 默认音量70%（0-1范围）
    
    // 从本地存储加载配置（仅加载，不自动生效）
    this.loadSettings();
    
    // 监听用户首次交互（点击/触摸），解锁音频播放
    this.listenUserInteraction();
    
    // 页面卸载时保存设置
    window.addEventListener('beforeunload', () => this.saveSettings());
  }
  
  // 加载本地存储的设置
  loadSettings() {
    // 加载音量设置（转换为0-1范围）
    const savedVolume = parseFloat(localStorage.getItem('gameVolume')) || 70;
    this.volume = savedVolume / 100;
    this.audio.volume = this.volume;
    
    // 加载背景音乐开关状态
    const savedEnabled = localStorage.getItem('bgMusicEnabled');
    if (savedEnabled !== null) {
      this.isEnabled = savedEnabled === 'true';
    } else {
      // 首次使用，默认关闭并保存
      localStorage.setItem('bgMusicEnabled', 'false');
    }
  }
  
  // 保存设置到本地存储
  saveSettings() {
    localStorage.setItem('bgMusicEnabled', this.isEnabled);
    localStorage.setItem('gameVolume', Math.round(this.volume * 100));
    // 保存播放进度（可选）
    localStorage.setItem('bgmCurrentTime', this.audio.currentTime);
  }
  
  // 监听用户首次交互（解锁音频播放）
  listenUserInteraction() {
    const interactionEvents = ['click', 'touchstart', 'keydown'];
    
    const unlockAudio = () => {
      this.hasUserInteraction = true;
      // 移除所有监听，避免重复触发
      interactionEvents.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
      
      // 如果用户之前已开启背景音乐，尝试播放
      if (this.isEnabled) {
        this.play().catch(err => {
          console.log('用户交互后仍无法播放BGM:', err);
        });
      }
    };
    
    // 添加多种交互监听
    interactionEvents.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true });
    });
  }
  
  // 播放BGM（增加严格的前置检查）
  play() {
    // 前置条件：用户已交互 + 背景音乐已启用
    if (!this.hasUserInteraction) {
      return Promise.reject('需要先与页面交互才能播放音频');
    }
    if (!this.isEnabled) {
      return Promise.reject('背景音乐未启用');
    }
    
    // 恢复上次的播放进度
    const savedTime = parseFloat(localStorage.getItem('bgmCurrentTime'));
    if (savedTime) {
      this.audio.currentTime = savedTime;
    }
    
    // 执行播放
    return this.audio.play().catch(err => {
      console.log('BGM播放失败:', err);
      throw err; // 抛出错误，让调用方处理
    });
  }
  
  // 暂停BGM
  pause() {
    this.audio.pause();
  }
  
  // 切换背景音乐启用/禁用状态（核心修改）
  toggleEnabled() {
    this.isEnabled = !this.isEnabled;
    this.saveSettings(); // 立即保存状态
    
    // 根据新状态执行播放/暂停
    if (this.isEnabled) {
      // 尝试播放，处理可能的错误
      this.play().then(() => {
        showMessage('背景音乐已开启', 'success');
      }).catch(err => {
        if (err.message.includes('需要先与页面交互')) {
          showMessage('请先点击页面任意位置，再开启背景音乐', 'warning');
          // 自动回滚开关状态（避免开关显示开启但实际无法播放）
          this.isEnabled = false;
          this.saveSettings();
        } else {
          showMessage('开启背景音乐失败', 'error');
        }
        console.log('切换播放状态失败:', err);
      });
    } else {
      this.pause();
      showMessage('背景音乐已关闭', 'info');
    }
  }
  
  // 设置音量（接收百分比值）
  setVolume(volumePercent) {
    // 限制范围在0-100，转换为0-1
    const volume = Math.max(0, Math.min(100, volumePercent)) / 100;
    this.volume = volume;
    this.audio.volume = volume;
    this.saveSettings();
  }
  
  // 获取音量（返回百分比）
  getVolume() {
    return Math.round(this.volume * 100);
  }
  
  // 获取启用状态
  getEnabled() {
    return this.isEnabled;
  }
  
  // 强制停止播放（备用方法）
  stop() {
    this.pause();
    this.audio.currentTime = 0;
  }
}

// 全局暴露，DOM加载完成后实例化
document.addEventListener('DOMContentLoaded', function() {
  window.bgmManager = new BGMManager();
  
  // 全局消息提示函数（如果start.js中未定义，需添加）
  if (typeof showMessage === 'undefined') {
    window.showMessage = function(message, type) {
      // 简化版提示（确保toggleEnabled能调用）
      const messageEl = document.createElement('div');
      messageEl.className = `simple-message message-${type}`;
      messageEl.textContent = message;
      messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      `;
      
      if (type === 'success') messageEl.style.background = '#4CAF50';
      else if (type === 'warning') messageEl.style.background = '#ff9800';
      else if (type === 'error') messageEl.style.background = '#f44336';
      else messageEl.style.background = '#2196F3';
      
      document.body.appendChild(messageEl);
      setTimeout(() => messageEl.remove(), 3000);
    };
  }
});