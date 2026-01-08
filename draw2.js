const fs = require('fs');
const createCsvParser = require('csv-parser');
const iconv = require('iconv-lite');
const { createCanvas, loadImage, registerFont } = require('canvas');

const templateImagePath = 'bg.jpg';
const csvFilePath = 'data.csv';

// 安装字体后，找到正确的中文字体路径
console.log('🔍 查找中文字体...');
const fontSearchPaths = [
  // Noto字体（Google开发，支持中文）
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
  
  // 文泉驿字体
  '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
  '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
  
  // 微软字体（如果安装了）
  '/usr/share/fonts/truetype/msttcorefonts/Arial.ttf',
  
  // DejaVu字体（不支持中文，仅作备用）
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
];

let chineseFontPath = null;
let chineseFontFamily = 'sans-serif';

for (const path of fontSearchPaths) {
  if (fs.existsSync(path)) {
    console.log(`✅ 找到字体: ${path}`);
    chineseFontPath = path;
    
    // 根据字体文件设置字体族名称
    if (path.includes('NotoSansCJK')) {
      chineseFontFamily = 'Noto Sans CJK SC';
    } else if (path.includes('wqy-microhei')) {
      chineseFontFamily = 'WenQuanYi Micro Hei';
    } else if (path.includes('wqy-zenhei')) {
      chineseFontFamily = 'WenQuanYi Zen Hei';
    } else if (path.includes('Arial')) {
      chineseFontFamily = 'Arial';
    }
    
    // 注册字体
    try {
      registerFont(path, { family: chineseFontFamily });
      console.log(`📝 注册字体: ${chineseFontFamily}`);
      break;
    } catch (err) {
      console.log(`❌ 注册失败: ${err.message}`);
    }
  }
}

if (!chineseFontPath) {
  console.log('⚠️ 未找到中文字体，尝试创建备用字体文件...');
  // 如果找不到字体，创建一个简单的回退方案
  chineseFontFamily = 'sans-serif';
}

const processData = () => {
  const rows = [];
  
  console.log('📖 读取CSV文件...');
  
  fs.createReadStream(csvFilePath)
    .pipe(iconv.decodeStream('gbk'))
    .pipe(createCsvParser())
    .on('data', (row) => {
      rows.push(row);
    })
    .on('end', async () => {
      console.log(`✅ 读取完成，共 ${rows.length} 条数据`);
      
      // 测试字体是否能显示中文
      console.log('🧪 测试字体渲染...');
      const testCanvas = createCanvas(400, 100);
      const testCtx = testCanvas.getContext('2d');
      testCtx.fillStyle = '#000000';
      
      // 测试不同字体
      const testFonts = [
        `36px "${chineseFontFamily}"`,
        '36px "Noto Sans CJK SC"',
        '36px "WenQuanYi Micro Hei"',
        '36px "Microsoft YaHei"',
        '36px "SimHei"',
        '36px "Arial"'
      ];
      
      let y = 30;
      for (const font of testFonts) {
        try {
          testCtx.font = font;
          testCtx.fillText(`中文测试 ${chineseFontFamily}`, 10, y);
          console.log(`✅ 字体测试: ${font}`);
        } catch (err) {
          console.log(`❌ 字体测试失败: ${font}`);
        }
        y += 20;
      }
      
      // 保存测试图片
      const testOut = fs.createWriteStream('font_test.jpg');
      testCanvas.createJPEGStream().pipe(testOut);
      testOut.on('finish', () => {
        console.log('📸 字体测试图片已保存: font_test.jpg');
      });
      
      // 加载模板图片
      console.log('🖼️ 加载模板图片...');
      const templateImage = await loadImage(templateImagePath);
      
      // 定义每个字段的字体大小配置（在这里修改）
      const fontSizeConfig = [
        30,  // 姓名字体大小
        36,  // 金额字体大小
        36   // 证书编号字体大小
      ];
      
      // 处理每一行数据
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const 姓名 = String(row.姓名 || '').trim();
        const 金额 = String(row.金额 || '').trim();
        const 证书编号 = String(row.证书编号 || '').trim();
        
        console.log(`🔄 处理 ${i + 1}/${rows.length}: ${姓名}`);
        
        // 创建Canvas
        const canvas = createCanvas(templateImage.width, templateImage.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(templateImage, 0, 0);
        
        // 如果中文显示失败，尝试使用位图字体或图片合成
        if (chineseFontFamily === 'sans-serif') {
          console.log('⚠️ 使用备用字体，中文可能显示为方框');
        }
        
        const coordinates = [
          { x: 446, y: 989 },
          { x: 533, y: 1148 },
          { x: 488, y: 2038 }
        ];
        
        const texts = [姓名, 金额, 证书编号];
        
        // 修改：为每个字段单独设置字体大小
        coordinates.forEach((coord, idx) => {
          if (texts[idx]) {
            try {
              // 设置当前字段的字体大小
              ctx.font = `${fontSizeConfig[idx]}px "${chineseFontFamily}"`;
              ctx.fillStyle = '#FFD700'; // 金黄色
              ctx.textAlign = 'left';
              
              // 绘制文本
              ctx.fillText(texts[idx], coord.x, coord.y);
              
              // 绘制边框以便调试
              ctx.strokeStyle = 'rgba(255,0,0,0.3)';
              ctx.strokeRect(coord.x - 5, coord.y - 30, 200, 40);
              
              // 调试信息
              console.log(`   字段${idx+1}: ${texts[idx].substring(0, 10)}... 字体: ${fontSizeConfig[idx]}px`);
            } catch (err) {
              console.log(`  文本绘制错误: ${err.message}`);
            }
          }
        });
        
        const filename = `${证书编号}-${姓名}.jpg`;
        const out = fs.createWriteStream(filename);
        const stream = canvas.createJPEGStream({ quality: 0.95 });
        
        await new Promise((resolve, reject) => {
          stream.pipe(out);
          out.on('finish', () => {
            console.log(`✅ 已生成: ${filename}`);
            resolve();
          });
          out.on('error', reject);
        });
      }
      
      console.log('\n🎉 所有图片生成完成！');
      console.log('📋 字体大小配置:');
      console.log(`   姓名: ${fontSizeConfig[0]}px`);
      console.log(`   金额: ${fontSizeConfig[1]}px`);
      console.log(`   证书编号: ${fontSizeConfig[2]}px`);
      console.log('\n📋 其他建议:');
      console.log('1. 检查 font_test.jpg 查看字体效果');
      console.log('2. 如中文显示异常，请安装中文字体');
      console.log('3. 运行: apt-get install fonts-noto-cjk');
      console.log('4. 修改 fontSizeConfig 数组调整各字段字体大小');
    })
    .on('error', (err) => {
      console.error('❌ 读取CSV失败:', err);
    });
};

processData();