#!/usr/bin/env bash
# Подбирает актуальные версии Yarn / Loader / Fabric API для MC из gradle.properties
set -euo pipefail
MC=$(grep '^minecraft_version=' gradle.properties | cut -d= -f2)
YARN=$(curl -fsS "https://meta.fabricmc.net/v2/versions/yarn/$MC" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['version'])")
LOADER=$(curl -fsS "https://meta.fabricmc.net/v2/versions/loader" | python3 -c "import sys,json;print([x for x in json.load(sys.stdin) if x['stable']][0]['version'])")
FAPI=$(curl -fsS "https://maven.fabricmc.net/net/fabricmc/fabric-api/fabric-api/maven-metadata.xml" | python3 -c "
import sys,re
v=re.findall(r'<version>([^<]+)</version>',sys.stdin.read())
c=[x for x in v if x.endswith('+$MC')]
print(c[-1])")
sed -i "s|^yarn_mappings=.*|yarn_mappings=$YARN|;s|^loader_version=.*|loader_version=$LOADER|;s|^fabric_api_version=.*|fabric_api_version=$FAPI|" gradle.properties
cat gradle.properties
