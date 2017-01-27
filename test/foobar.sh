#!/bin/bash

npm run erun -- foobartest localhost-custom arg1 arg2
ACTUAL=$( cat ./test/output/foobartest.out )
EXPECTED="FOO=foo BAR=bar FOOBAR=foo-bar ENV=localhost SUBENV=custom SUBENV0=localhost SUBENV1=custom arg1 arg2"

echo "ACTUAL  : ${ACTUAL}"
echo "EXPECTED: ${EXPECTED}"
test "${ACTUAL}" == "${EXPECTED}"
