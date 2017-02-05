#!/bin/bash

npm run erun -- foobartest localhost-custom arg1 arg2 > ./test/output/foobartest.out
ACTUAL=$( cat ./test/output/foobartest.out | grep '^foobartest' )
EXPECTED="foobartest BASEONLY=foobartestbase FOO=foo BAR=bar FOOBAR=main-localhost-foo-bar localhost custom localhost custom arg1 arg2"

echo "ACTUAL  : ${ACTUAL}"
echo "EXPECTED: ${EXPECTED}"
test "${ACTUAL}" = "${EXPECTED}"
