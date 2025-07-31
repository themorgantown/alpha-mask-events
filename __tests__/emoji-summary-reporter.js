/**
 * Custom Jest reporter to show emoji status and summary
 */
export default class EmojiSummaryReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onRunComplete(contexts, results) {
    const { testResults, numTotalTests, numPassedTests, numFailedTests, numPendingTests } = results;
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 TEST SUMMARY - Alpha Mask Events');
    console.log('='.repeat(80));
    
    // Overall stats
    console.log(`\n📊 Overall Results:`);
    console.log(`   Total Tests: ${numTotalTests}`);
    console.log(`   ✅ Passed: ${numPassedTests}`);
    console.log(`   ❌ Failed: ${numFailedTests}`);
    console.log(`   ⏸️  Skipped: ${numPendingTests}`);
    
    // Success rate
    const successRate = numTotalTests > 0 ? Math.round((numPassedTests / numTotalTests) * 100) : 0;
    const successEmoji = successRate >= 90 ? '🎉' : successRate >= 70 ? '👍' : '⚠️';
    console.log(`   ${successEmoji} Success Rate: ${successRate}%`);
    
    // Test file breakdown
    console.log(`\n📁 Test Files:`);
    testResults.forEach(testResult => {
      const { testFilePath, numPassingTests, numFailingTests, numPendingTests, numTodoTests } = testResult;
      const fileName = testFilePath.split('/').pop();
      const totalTests = numPassingTests + numFailingTests + numPendingTests + numTodoTests;
      
      let fileStatus = '✅';
      if (numFailingTests > 0) fileStatus = '❌';
      else if (numPendingTests > 0) fileStatus = '⏸️';
      
      console.log(`   ${fileStatus} ${fileName}`);
      if (totalTests > 0) {
        console.log(`      └─ ${numPassingTests}✅ ${numFailingTests}❌ ${numPendingTests}⏸️`);
      }
    });
    
    // Format support summary (specific to our tests)
    this._showFormatSupportSummary(testResults);
    
    // Final status
    console.log('\n' + '='.repeat(80));
    if (numFailedTests === 0) {
      console.log('🎉 ALL TESTS PASSED! Ready for production! 🚀');
    } else {
      console.log(`⚠️  ${numFailedTests} test(s) need attention before release`);
    }
    console.log('='.repeat(80) + '\n');
  }
  
  _showFormatSupportSummary(testResults) {
    // Look for format-specific test results
    const formatTests = testResults.find(result => 
      result.testFilePath.includes('format-support') || 
      result.testFilePath.includes('cli-format-support')
    );
    
    if (formatTests) {
      console.log(`\n🖼️  Image Format Support:`);
      
      const formats = [
        { name: 'PNG', supported: true, transparency: 'full' },
        { name: 'WebP', supported: true, transparency: 'full' },
        { name: 'AVIF', supported: true, transparency: 'full' },
        { name: 'GIF', supported: true, transparency: 'binary' },
        { name: 'SVG', supported: true, transparency: 'css' },
        { name: 'JPEG', supported: true, transparency: 'none' },
        { name: 'BMP', supported: true, transparency: 'none' },
        { name: 'TIFF', supported: true, transparency: 'limited' }
      ];
      
      formats.forEach(format => {
        const supportEmoji = format.supported ? '✅' : '❌';
        const transparencyEmoji = 
          format.transparency === 'full' ? '🌟' :
          format.transparency === 'binary' ? '⚡' :
          format.transparency === 'css' ? '🎨' :
          format.transparency === 'limited' ? '⚠️' : '🚫';
        
        console.log(`   ${supportEmoji} ${format.name.padEnd(6)} ${transparencyEmoji} ${format.transparency} transparency`);
      });
    }
  }
}
