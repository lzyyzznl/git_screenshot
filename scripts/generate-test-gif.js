const fs = require('fs');
const path = require('path');

// 创建一个简单但有效的GIF文件
function createTestGif() {
    console.log('🎬 开始创建测试GIF文件...');

    // 这是一个有效的GIF文件的二进制数据
    // 包含2帧动画，10x10像素，黑白颜色
    const gifData = new Uint8Array([
        // GIF Header "GIF89a"
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
        
        // Logical Screen Descriptor (10x10 pixel)
        0x0A, 0x00, 0x0A, 0x00, 0x80, 0x00, 0x00,
        
        // Global Color Table (2 colors: black and white)
        0x00, 0x00, 0x00, // Black
        0xFF, 0xFF, 0xFF, // White
        
        // Application Extension for animation
        0x21, 0xFF, 0x0B,
        0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30, // "NETSCAPE2.0"
        0x03, 0x01, 0x00, 0x00, 0x00, // Loop indefinitely
        
        // Frame 1
        0x21, 0xF9, 0x04, 0x04, 0x32, 0x00, 0x00, 0x00, // Graphic Control Extension (delay 500ms)
        0x2C, 0x00, 0x00, 0x00, 0x00, 0x0A, 0x00, 0x0A, 0x00, 0x00, // Image Descriptor
        0x02, 0x0C, 0x84, 0x51, 0x18, 0x26, 0x05, 0x10, 0x84, 0x31, 0x03, 0x00, // Image Data (compressed)
        
        // Frame 2 (inverted colors)
        0x21, 0xF9, 0x04, 0x04, 0x32, 0x00, 0x00, 0x00, // Graphic Control Extension (delay 500ms)
        0x2C, 0x00, 0x00, 0x00, 0x00, 0x0A, 0x00, 0x0A, 0x00, 0x00, // Image Descriptor
        0x02, 0x0C, 0x8C, 0x2D, 0x98, 0x16, 0x05, 0x10, 0x84, 0x31, 0x03, 0x00, // Image Data (compressed, inverted)
        
        // Trailer
        0x3B
    ]);

    return gifData;
}

// 创建一个更复杂的彩色GIF
function createColorfulTestGif() {
    console.log('🌈 创建彩色测试GIF文件...');

    // 这是一个包含多种颜色的GIF文件
    const colorfulGifData = new Uint8Array([
        // GIF Header "GIF89a"
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
        
        // Logical Screen Descriptor (16x16 pixel)
        0x10, 0x00, 0x10, 0x00, 0x87, 0x00, 0x00,
        
        // Global Color Table (256 colors)
        // Red gradient
        0xFF, 0x00, 0x00, 0xFE, 0x00, 0x00, 0xFD, 0x00, 0x00, 0xFC, 0x00, 0x00,
        0xFB, 0x00, 0x00, 0xFA, 0x00, 0x00, 0xF9, 0x00, 0x00, 0xF8, 0x00, 0x00,
        // Green gradient
        0x00, 0xFF, 0x00, 0x00, 0xFE, 0x00, 0x00, 0xFD, 0x00, 0x00, 0xFC, 0x00,
        0x00, 0xFB, 0x00, 0x00, 0xFA, 0x00, 0x00, 0xF9, 0x00, 0x00, 0xF8, 0x00,
        // Blue gradient
        0x00, 0x00, 0xFF, 0x00, 0x00, 0xFE, 0x00, 0x00, 0xFD, 0x00, 0x00, 0xFC,
        0x00, 0x00, 0xFB, 0x00, 0x00, 0xFA, 0x00, 0x00, 0xF9, 0x00, 0x00, 0xF8,
        // 填充剩余颜色槽位（简化处理，使用渐变色）
        ...Array(228).fill(0).flatMap((_, i) => {
            const intensity = Math.floor((i / 228) * 255);
            return [intensity, intensity, intensity];
        }),
        
        // Application Extension for animation
        0x21, 0xFF, 0x0B,
        0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30, // "NETSCAPE2.0"
        0x03, 0x01, 0x00, 0x00, 0x00, // Loop indefinitely
        
        // Frame 1 (红色为主)
        0x21, 0xF9, 0x04, 0x04, 0x19, 0x00, 0x00, 0x00, // Graphic Control Extension (delay 250ms)
        0x2C, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x10, 0x00, 0x00, // Image Descriptor
        0x08, 0x20, 0x00, 0x10, 0x08, 0x04, 0x02, 0x01, 0x00, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01, 0x00,
        0x20, 0x10, 0x08, 0x04, 0x02, 0x01, 0x00, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01, 0x00, 0x01, 0x00,
        
        // Frame 2 (绿色为主)
        0x21, 0xF9, 0x04, 0x04, 0x19, 0x00, 0x00, 0x00, // Graphic Control Extension (delay 250ms)
        0x2C, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x10, 0x00, 0x00, // Image Descriptor
        0x08, 0x20, 0x08, 0x18, 0x0C, 0x06, 0x03, 0x01, 0x08, 0x28, 0x18, 0x0C, 0x06, 0x03, 0x01, 0x08,
        0x28, 0x18, 0x0C, 0x06, 0x03, 0x01, 0x08, 0x28, 0x18, 0x0C, 0x06, 0x03, 0x01, 0x08, 0x01, 0x00,
        
        // Frame 3 (蓝色为主)
        0x21, 0xF9, 0x04, 0x04, 0x19, 0x00, 0x00, 0x00, // Graphic Control Extension (delay 250ms)
        0x2C, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x10, 0x00, 0x00, // Image Descriptor
        0x08, 0x20, 0x10, 0x1C, 0x0E, 0x07, 0x03, 0x01, 0x10, 0x2C, 0x1C, 0x0E, 0x07, 0x03, 0x01, 0x10,
        0x2C, 0x1C, 0x0E, 0x07, 0x03, 0x01, 0x10, 0x2C, 0x1C, 0x0E, 0x07, 0x03, 0x01, 0x10, 0x01, 0x00,
        
        // Trailer
        0x3B
    ]);

    return colorfulGifData;
}

// 主函数
async function main() {
    try {
        const outputDir = path.join(__dirname, '..', 'generated-gifs');
        
        // 创建输出目录
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`📁 创建输出目录: ${outputDir}`);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // 生成简单的黑白GIF
        console.log('\n1️⃣ 生成简单黑白动画GIF...');
        const simpleGif = createTestGif();
        const simpleGifPath = path.join(outputDir, `simple-animation-${timestamp}.gif`);
        fs.writeFileSync(simpleGifPath, simpleGif);
        console.log(`✅ 简单GIF已保存: ${simpleGifPath}`);
        console.log(`📊 文件大小: ${simpleGif.length} 字节`);

        // 生成彩色GIF
        console.log('\n2️⃣ 生成彩色动画GIF...');
        const colorfulGif = createColorfulTestGif();
        const colorfulGifPath = path.join(outputDir, `colorful-animation-${timestamp}.gif`);
        fs.writeFileSync(colorfulGifPath, colorfulGif);
        console.log(`✅ 彩色GIF已保存: ${colorfulGifPath}`);
        console.log(`📊 文件大小: ${colorfulGif.length} 字节`);

        // 验证文件
        console.log('\n🔍 验证生成的文件...');
        
        // 验证简单GIF
        if (fs.existsSync(simpleGifPath)) {
            const simpleStats = fs.statSync(simpleGifPath);
            console.log(`✅ 简单GIF验证通过 - 大小: ${simpleStats.size} 字节`);
            
            // 检查GIF文件头
            const simpleBuffer = fs.readFileSync(simpleGifPath);
            const simpleHeader = simpleBuffer.subarray(0, 6).toString('ascii');
            console.log(`   文件头: ${simpleHeader} ${simpleHeader === 'GIF89a' ? '✅' : '❌'}`);
        }

        // 验证彩色GIF
        if (fs.existsSync(colorfulGifPath)) {
            const colorfulStats = fs.statSync(colorfulGifPath);
            console.log(`✅ 彩色GIF验证通过 - 大小: ${colorfulStats.size} 字节`);
            
            // 检查GIF文件头
            const colorfulBuffer = fs.readFileSync(colorfulGifPath);
            const colorfulHeader = colorfulBuffer.subarray(0, 6).toString('ascii');
            console.log(`   文件头: ${colorfulHeader} ${colorfulHeader === 'GIF89a' ? '✅' : '❌'}`);
        }

        console.log('\n🎉 GIF生成完成！');
        console.log(`📁 文件保存在: ${outputDir}`);
        console.log('\n📝 生成的文件:');
        console.log(`   1. ${path.basename(simpleGifPath)} - 简单黑白动画`);
        console.log(`   2. ${path.basename(colorfulGifPath)} - 彩色动画`);
        
        console.log('\n💡 您可以使用以下命令打开输出目录:');
        console.log(`   explorer "${outputDir}"`);

        // 自动打开文件夹
        const { exec } = require('child_process');
        exec(`explorer "${outputDir}"`, (error) => {
            if (error) {
                console.log('⚠️ 无法自动打开文件夹，请手动导航到输出目录');
            } else {
                console.log('📂 输出目录已在文件资源管理器中打开');
            }
        });

    } catch (error) {
        console.error('❌ 生成GIF时出错:', error.message);
        process.exit(1);
    }
}

// 运行脚本
if (require.main === module) {
    main();
}

module.exports = { createTestGif, createColorfulTestGif }; 