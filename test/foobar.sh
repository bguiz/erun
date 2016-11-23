#!/bin/bash

npm run erun -- foobartest localhost arg1 arg2
ACTUAL=$( cat ./test/output/foobartest.out )
EXPECTED="FOO=foo BAR=bar FOOBAR=foo-bar ENVIRONMENT=localhost arg1 arg2"

echo "ACTUAL  : ${ACTUAL}"
echo "EXPECTED: ${EXPECTED}"
test "${ACTUAL}" == "${EXPECTED}"
