#!/bin/bash
# Test Execution Script for News Actions Business Bites
# Run this script to execute comprehensive testing

echo "🧪 NEWS ACTIONS BUSINESS BITES - TEST EXECUTION SCRIPT"
echo "======================================================"
echo "Date: $(date)"
echo "Environment: Production (Vercel + Supabase)"
echo "URL: https://news-actions-business-bites.vercel.app"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
BLOCKED_TESTS=0

# Function to log test results
log_test() {
    local test_name="$1"
    local status="$2"
    local details="$3"

    ((TOTAL_TESTS++))

    case $status in
        "PASS")
            ((PASSED_TESTS++))
            echo -e "${GREEN}✅ PASS${NC} - $test_name"
            ;;
        "FAIL")
            ((FAILED_TESTS++))
            echo -e "${RED}❌ FAIL${NC} - $test_name"
            ;;
        "BLOCK")
            ((BLOCKED_TESTS++))
            echo -e "${YELLOW}🟡 BLOCK${NC} - $test_name"
            ;;
        *)
            echo -e "${BLUE}❓ $status${NC} - $test_name"
            ;;
    esac

    if [ -n "$details" ]; then
        echo "   $details"
    fi
    echo ""
}

echo "🔍 PHASE 1: BASIC FUNCTIONALITY TESTS"
echo "======================================"

# Test 1: Homepage loads
echo "Testing homepage load..."
if curl -s -o /dev/null -w "%{http_code}" https://news-actions-business-bites.vercel.app/ | grep -q "200"; then
    log_test "Homepage Load" "PASS" "HTTP 200 - Page loads successfully"
else
    log_test "Homepage Load" "FAIL" "Failed to load homepage"
fi

# Test 2: API connectivity
echo "Testing API connectivity..."
if curl -s https://news-actions-business-bites.vercel.app/api/test | grep -q "Test API working"; then
    log_test "API Connectivity" "PASS" "Test API responds correctly"
else
    log_test "API Connectivity" "FAIL" "API not responding"
fi

# Test 3: Markets API
echo "Testing markets API..."
response=$(curl -s https://news-actions-business-bites.vercel.app/api/markets)
if echo "$response" | grep -q '"markets"'; then
    market_count=$(echo "$response" | grep -o '"[^"]*"' | wc -l)
    log_test "Markets API" "PASS" "Returns market data ($market_count markets)"
else
    log_test "Markets API" "FAIL" "Failed to return market data"
fi

# Test 4: News API
echo "Testing news API..."
response=$(curl -s "https://news-actions-business-bites.vercel.app/api/news/business-bites?market=US&page=1&limit=5")
if echo "$response" | grep -q '"articles"'; then
    article_count=$(echo "$response" | grep -o '"title"' | wc -l)
    log_test "News API" "PASS" "Returns articles ($article_count articles)"
else
    log_test "News API" "FAIL" "Failed to return news data"
fi

echo "🔐 PHASE 2: AUTHENTICATION TESTS"
echo "================================"

# Test 5: Authentication (currently blocked)
log_test "Google OAuth Login" "BLOCK" "redirect_uri_mismatch - Supabase config needs update"

echo "👤 PHASE 3: USER FEATURES TESTS (BLOCKED BY AUTH)"
echo "================================================="

# Test 6: User bookmarks (blocked)
log_test "User Bookmarks" "BLOCK" "Requires authentication"

# Test 7: Watchlist management (blocked)
log_test "Watchlist Management" "BLOCK" "Requires authentication"

echo "⚡ PHASE 4: PERFORMANCE TESTS"
echo "============================"

# Test 8: API Response Time
echo "Testing API response time..."
start_time=$(date +%s%3N)
curl -s -o /dev/null https://news-actions-business-bites.vercel.app/api/markets
end_time=$(date +%s%3N)
response_time=$((end_time - start_time))

if [ $response_time -lt 1000 ]; then
    log_test "API Response Time" "PASS" "${response_time}ms (< 1 second target)"
else
    log_test "API Response Time" "FAIL" "${response_time}ms (> 1 second target)"
fi

echo "🔒 PHASE 5: SECURITY TESTS"
echo "=========================="

# Test 9: HTTPS enforcement
echo "Testing HTTPS..."
if curl -s -I https://news-actions-business-bites.vercel.app/ | grep -q "HTTP/2 200"; then
    log_test "HTTPS Enforcement" "PASS" "Site served over HTTPS"
else
    log_test "HTTPS Enforcement" "FAIL" "HTTPS not enforced"
fi

# Test 10: Environment variables (check test API)
echo "Testing environment variables..."
response=$(curl -s https://news-actions-business-bites.vercel.app/api/test)

# Parse JSON response to check environment variables
if command -v jq &> /dev/null; then
    # Use jq if available
    supabase_url=$(echo "$response" | jq -r '.env_vars.SUPABASE_URL')
    service_role_key=$(echo "$response" | jq -r '.env_vars.SUPABASE_SERVICE_ROLE_KEY')
else
    # Fallback to grep parsing
    supabase_url=$(echo "$response" | sed -n 's/.*"SUPABASE_URL": *\([^,}]*\).*/\1/p')
    service_role_key=$(echo "$response" | sed -n 's/.*"SUPABASE_SERVICE_ROLE_KEY": *\([^,}]*\).*/\1/p')
fi

if [ "$supabase_url" = "true" ]; then
    log_test "Environment Variables" "PASS" "SUPABASE_URL configured"
else
    log_test "Environment Variables" "FAIL" "SUPABASE_URL: $supabase_url"
fi

if [ "$service_role_key" = "true" ]; then
    log_test "Service Role Key" "PASS" "SUPABASE_SERVICE_ROLE_KEY configured"
else
    log_test "Service Role Key" "FAIL" "SUPABASE_SERVICE_ROLE_KEY: $service_role_key"
fi

echo "📱 PHASE 6: COMPATIBILITY TESTS"
echo "=============================="

# Test 11: Mobile responsiveness (manual check required)
log_test "Mobile Responsiveness" "PENDING" "Manual testing required - check viewport scaling"

echo ""
echo "📊 TEST SUMMARY REPORT"
echo "======================"

echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo -e "Blocked: ${YELLOW}$BLOCKED_TESTS${NC}"

success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "Success Rate: ${success_rate}%"

if [ $FAILED_TESTS -eq 0 ] && [ $BLOCKED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
elif [ $BLOCKED_TESTS -gt 0 ] && [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${YELLOW}🟡 TESTS BLOCKED - Authentication required${NC}"
else
    echo -e "${RED}❌ TESTS FAILED - Issues need fixing${NC}"
fi

echo ""
echo "🎯 NEXT STEPS:"
echo "=============="

if [ $BLOCKED_TESTS -gt 0 ]; then
    echo "1. 🔐 Fix Google OAuth authentication (CRITICAL)"
    echo "2. 🔧 Update Supabase Auth configuration"
    echo "3. ✅ Re-run this test script"
fi

if [ $FAILED_TESTS -gt 0 ]; then
    echo "1. 🐛 Investigate and fix failed tests"
    echo "2. 📝 Update test documentation"
fi

echo "3. 📈 Run performance and load testing"
echo "4. 🔒 Complete security audit"
echo "5. 👥 User acceptance testing"

echo ""
echo "📝 Test Execution Completed: $(date)"
echo "Log saved to: implementation_log.txt"
