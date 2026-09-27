/**
 * PageLoader-Order-Regression-Test.gs
 * 
 * Regression test untuk memastikan getPageContent dan delete-handler
 * load dalam urutan yang benar tanpa override yang tidak diinginkan.
 * 
 * SETUP: Deploy di staging Apps Script project dengan appsscript.json
 *        filePushOrder yang telah diupdate.
 */

function testPageLoaderOrder() {
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };

  // TEST 1: Verify getPageContent function exists and has correct signature
  try {
    if (typeof getPageContent !== 'function') {
      throw new Error('getPageContent is not a function');
    }
    testResults.tests.push({
      name: 'getPageContent exists',
      status: 'PASS',
      message: 'getPageContent function defined'
    });
    testResults.summary.passed++;
  } catch (e) {
    testResults.tests.push({
      name: 'getPageContent exists',
      status: 'FAIL',
      message: e.toString()
    });
    testResults.summary.failed++;
  }

  // TEST 2: Verify delete handler is accessible
  try {
    if (typeof doDeleteJadwalPadam !== 'function') {
      throw new Error('doDeleteJadwalPadam handler not found');
    }
    testResults.tests.push({
      name: 'doDeleteJadwalPadam handler exists',
      status: 'PASS',
      message: 'Delete handler function defined'
    });
    testResults.summary.passed++;
  } catch (e) {
    testResults.tests.push({
      name: 'doDeleteJadwalPadam handler exists',
      status: 'FAIL',
      message: e.toString()
    });
    testResults.summary.failed++;
  }

  // TEST 3: Verify delete-script injection mechanism
  try {
    const testPage = getPageContent('Jadwal-Padam');
    if (!testPage || typeof testPage !== 'string') {
      throw new Error('getPageContent return type invalid');
    }
    if (testPage.indexOf('delete') === -1) {
      testResults.tests.push({
        name: 'Delete script injection present',
        status: 'WARNING',
        message: 'No "delete" keyword found in page content - verify intentional'
      });
      testResults.summary.warnings++;
    } else {
      testResults.tests.push({
        name: 'Delete script injection present',
        status: 'PASS',
        message: 'Delete functionality detected in page content'
      });
      testResults.summary.passed++;
    }
  } catch (e) {
    testResults.tests.push({
      name: 'Delete script injection present',
      status: 'FAIL',
      message: e.toString()
    });
    testResults.summary.failed++;
  }

  // TEST 4: Verify Compat override tidak menghilangkan Core logic
  try {
    const funcString = getPageContent.toString();
    const hasCompat = funcString.indexOf('Compat') !== -1;
    const hasCore = funcString.indexOf('Core') !== -1;
    
    if (hasCompat && !hasCore) {
      testResults.tests.push({
        name: 'Core override check',
        status: 'FAIL',
        message: 'Compat version loaded, Core version not detected'
      });
      testResults.summary.failed++;
    } else {
      testResults.tests.push({
        name: 'Core override check',
        status: 'PASS',
        message: 'File loading order appears correct'
      });
      testResults.summary.passed++;
    }
  } catch (e) {
    testResults.tests.push({
      name: 'Core override check',
      status: 'FAIL',
      message: e.toString()
    });
    testResults.summary.failed++;
  }

  // Log results
  Logger.log('=== PageLoader Order Regression Test ===');
  Logger.log(JSON.stringify(testResults, null, 2));
  
  // Return for API access
  return testResults;
}

function runPageLoaderTest() {
  const results = testPageLoaderOrder();
  Logger.log('\n✓ Test execution complete');
  Logger.log(`✓ Passed: ${results.summary.passed}`);
  Logger.log(`✗ Failed: ${results.summary.failed}`);
  Logger.log(`⚠ Warnings: ${results.summary.warnings}`);
  return results;
}